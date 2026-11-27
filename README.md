# Smart AI Chatbot

![React](https://img.shields.io/badge/React-20232a?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)

A responsive chatbot web application built with React, TypeScript, Vite, Tailwind CSS and shadcn/ui.

## Features
- Interactive conversational interface.
- Responsive component-based UI.
- TypeScript development and Vite build workflow.

## Architecture
```text
Browser → React / TypeScript UI → configured application services
```
The repository also includes Supabase configuration. Model-provider integration and deployment have not been independently validated.

## Local setup
```bash
git clone https://github.com/theNotorious19/Smart_Ai-bot.git
cd Smart_Ai-bot
npm ci
npm run dev
```
Open the local URL printed by Vite. Configure any required service environment variables locally. Never commit private API keys or service-role credentials. A tracked .env file should be reviewed and sensitive credentials rotated if present.

## Production build
```bash
npm run build
```

## License
See [LICENSE](LICENSE).

[Author: Durvesh Sonawane](https://github.com/theNotorious19)
