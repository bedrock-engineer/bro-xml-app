# Bedrock BRO/XML Viewer

Free, open-source web application for viewing and visualizing BRO/XML files.


[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Live Demo:** [bro.bedrock.engineer](https://bro.bedrock.engineer)

## About

<img src="/public/bedrock.svg" width="300px" alt="Bedrock Logo" />

This is a free web application by [Bedrock](https://bedrock.engineer) that provides a fast, modern interface for viewing and analyzing BRO/XML files directly in your browser.
It also let's you download data from the BRO/XML files as CSV or JSON, and the locations of multiple files as GeoJSON.

### Supported BRO Types

- BHR-G
- BHR-GT + BHR-GT-BMA
- CPT

## Technology Stack

- **Parser** Bedrock BRO/XML parser
- **Framework**: [React Router v7](https://reactrouter.com/) with Server-Side Rendering
- **Build Tool**: [Vite](https://vite.dev/)
- **Language**: TypeScript (strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visualization**: [Observable Plot](https://observablehq.com/plot/)
- **Maps**: [Leaflet](https://leafletjs.com/)
- **UI Components**: [React Aria Components](https://react-spectrum.adobe.com/react-aria/)
- **Internationalization**: [i18next](https://www.i18next.com/) and [remix-i18next](https://v2.remix.run/resources/remix-i18next)

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm

### Local Development

```bash
git clone https://github.com/bedrock-engineer/bro-xml-app.git
cd bro-webapp

npm install

npm run dev
```

The app will be available at `http://localhost:5173`

### Development Commands

```bash
npm run dev        # Start development server with HMR
npm run build      # Create production build
npm run start      # Start production server
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## Deployment

This application can be deployed to various platforms. See the [React Router docs on deploying](https://reactrouter.com/start/framework/deploying).

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Run `npm run typecheck`, `npm run lint`, and `npm run knip`, read the warnings and use your best judgement before committing
2. Follow the existing code style
3. Adding tests for new features, or tests for existing code for that matter, is encouraged

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/bedrock-engineer/bro-xml-app/issues) 
- **Live App**: Try it at [bro.bedrock.engineer](https://bro.bedrock.engineer)

[Bedrock](https://bedrock.engineer)
