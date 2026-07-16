# Bedrock Geotechnical BRO/XML Viewer

Free, open-source web application for viewing and visualizing geotechnical BRO/XML files.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[bro.bedrock.engineer](https://bro.bedrock.engineer)

## About

<a href="https://bedrock.engineer">
<img src="https://bedrock.engineer/Bedrock_TextRight.png" width="300px" alt="Bedrock Logo" />
</a>

This is a free web application by [Bedrock.engineer](https://bedrock.engineer) that provides a fast, modern interface for viewing and analyzing geotechnical BRO/XML files directly in your browser.
It also let's you download data from the BRO/XML files as CSV or JSON, and the locations of multiple files as a GeoJSON.

### Supported BRO Types

- BHR-G (Geological boreholes)
- BHR-GT + BHR-GT-BMA (Geotechnical boreholes and geotechnical lab samples)
- CPT (Cone Penetration tests)

## Technology Stack

- **Parser**: [Bedrock.engineer BRO/XML parser](https://github.com/orgs/bedrock-engineer/repositories?type=all)
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

By [Bedrock.engineer](https://bedrock.engineer)
