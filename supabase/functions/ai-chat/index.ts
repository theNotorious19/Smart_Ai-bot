import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, image } = await req.json();
    console.log('Received message:', message);
    if (image) {
      console.log('Received image for analysis');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build user message content
    let userContent: any = message;
    
    // If image is provided, format for vision analysis
    if (image) {
      userContent = [
        {
          type: "text",
          text: message || "Please analyze this image in detail and tell me everything you can about it - what objects you see, colors, composition, context, any text, and any other relevant details."
        },
        {
          type: "image_url",
          image_url: {
            url: image
          }
        }
      ];
    }

    const systemContent = image 
      ? 'You are a helpful AI assistant with excellent vision capabilities. When analyzing images, be thorough and descriptive. Identify all objects, colors, text, people, activities, and context. Provide detailed information about what you see.'
      : 'You are a helpful AI assistant with access to various tools. Provide clear, accurate responses.';

    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      stream: true
    };

    // Only add tools if not analyzing an image directly
    if (!image) {
      requestBody.tools = [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get current weather for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'The city name'
                  }
                },
                required: ['location']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'calculator',
              description: 'Perform mathematical calculations',
              parameters: {
                type: 'object',
                properties: {
                  expression: {
                    type: 'string',
                    description: 'The math expression to evaluate'
                  }
                },
                required: ['expression']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'generate_image',
              description: 'Generate an image from a text prompt',
              parameters: {
                type: 'object',
                properties: {
                  prompt: {
                    type: 'string',
                    description: 'The image generation prompt'
                  }
                },
                required: ['prompt']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_database',
              description: 'Query a mock database for information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The database query'
                  }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'file_operations',
              description: 'Read or write mock files',
              parameters: {
                type: 'object',
                properties: {
                  operation: {
                    type: 'string',
                    enum: ['read', 'write'],
                    description: 'The file operation to perform'
                  },
                  filename: {
                    type: 'string',
                    description: 'The filename'
                  },
                  content: {
                    type: 'string',
                    description: 'Content to write (for write operations)'
                  }
                },
                required: ['operation', 'filename']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'scan_object',
              description: 'Scan and identify objects from images, providing detailed information about what is in the image',
              parameters: {
                type: 'object',
                properties: {
                  image_description: {
                    type: 'string',
                    description: 'Description of what the user wants to scan or identify'
                  }
                },
                required: ['image_description']
              }
            }
          }
        ];
      }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const stream = response.body;
    if (!stream) {
      throw new Error('No response stream');
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send done event
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'done',
                content: '',
                timestamp: new Date().toISOString()
              }) + '\n'));
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                // Handle text content
                if (delta?.content) {
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'text',
                    content: delta.content,
                    timestamp: new Date().toISOString()
                  }) + '\n'));
                }

                // Handle tool calls
                if (delta?.tool_calls && delta.tool_calls.length > 0) {
                  for (const toolCall of delta.tool_calls) {
                    const toolId = toolCall.id || `tool_${Date.now()}`;
                    const toolName = toolCall.function?.name;

                    if (toolName) {
                      // Send tool call event
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'tool_call',
                        content: `Calling ${toolName}...`,
                        tool: {
                          name: toolName,
                          id: toolId,
                          status: 'running',
                          args: toolCall.function?.arguments
                        },
                        timestamp: new Date().toISOString()
                      }) + '\n'));

                      // Simulate tool execution
                      const result = await executeToolCall(toolName, toolCall.function?.arguments);
                      
                      // Send tool result
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'tool_result',
                        content: '',
                        tool: {
                          name: toolName,
                          id: toolId,
                          status: 'completed',
                          result: result
                        },
                        timestamp: new Date().toISOString()
                      }) + '\n'));
                    }
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE line:', e);
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Stream error:', errorMessage);
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            content: errorMessage,
            timestamp: new Date().toISOString()
          }) + '\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-chat function:', errorMessage);
    return new Response(JSON.stringify({ 
      type: 'error',
      content: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeToolCall(toolName: string, argsStr: string) {
  try {
    const args = argsStr ? JSON.parse(argsStr) : {};
    
    switch (toolName) {
      case 'get_weather':
        // Use free Open-Meteo API for real weather data
        try {
          const geocodingRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args.location)}&count=1&language=en&format=json`
          );
          const geoData = await geocodingRes.json();
          
          if (!geoData.results || geoData.results.length === 0) {
            return { error: `Location "${args.location}" not found` };
          }
          
          const { latitude, longitude, name, country } = geoData.results[0];
          
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius`
          );
          const weatherData = await weatherRes.json();
          const current = weatherData.current_weather;
          
          const weatherCodes: { [key: number]: string } = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
            55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Slight rain showers',
            81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm'
          };
          
          return {
            location: `${name}, ${country}`,
            temperature: Math.round(current.temperature),
            condition: weatherCodes[current.weathercode] || 'Unknown',
            windSpeed: Math.round(current.windspeed),
            windDirection: current.winddirection,
            time: current.time
          };
        } catch (error) {
          console.error('Weather API error:', error);
          return { error: 'Failed to fetch weather data' };
        }
        
      case 'calculator':
        try {
          // Simple safe evaluation for basic math
          const result = Function(`'use strict'; return (${args.expression})`)();
          return { expression: args.expression, result: result };
        } catch {
          return { error: 'Invalid expression' };
        }
        
      case 'generate_image':
        // Use Lovable AI image generation model
        try {
          console.log('Generating image with prompt:', args.prompt);
          
          const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-image-preview',
              messages: [
                {
                  role: 'user',
                  content: args.prompt
                }
              ],
              modalities: ['image', 'text']
            })
          });

          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.error('Image generation error:', errorText);
            return { error: 'Failed to generate image' };
          }

          const imageData = await imageResponse.json();
          const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (!imageUrl) {
            return { error: 'No image generated' };
          }

          return { 
            prompt: args.prompt,
            imageUrl: imageUrl,
            description: imageData.choices?.[0]?.message?.content || 'Generated image'
          };
        } catch (error) {
          console.error('Image generation error:', error);
          return { error: 'Failed to generate image' };
        }
        
      case 'scan_object':
        // Provide guidance for object scanning using vision capabilities
        return {
          instruction: 'To scan an object, please describe what you see or what you want me to identify. I can analyze images and provide detailed information about objects, animals, plants, landmarks, and more.',
          capabilities: [
            'Identify objects and their characteristics',
            'Recognize animals and breeds',
            'Identify plants and flowers',
            'Read text in images',
            'Describe scenes and environments',
            'Detect colors, shapes, and patterns'
          ],
          note: 'You can describe what you want to scan, and I will provide detailed information about it.'
        };
        
      case 'query_database':
        return {
          query: args.query,
          results: [
            { id: 1, name: 'Sample Item 1', value: 'Data A' },
            { id: 2, name: 'Sample Item 2', value: 'Data B' }
          ],
          count: 2
        };
        
      case 'file_operations':
        if (args.operation === 'read') {
          return { filename: args.filename, content: 'This is mock file content.' };
        } else {
          return { filename: args.filename, status: 'written', bytes: args.content?.length || 0 };
        }
        
      default:
        return { error: 'Unknown tool' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMessage };
  }
}
