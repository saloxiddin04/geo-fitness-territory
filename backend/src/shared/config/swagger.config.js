const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Geo Fitness Territory API',
      version: '1.0.0',
      description: 'O\'zbekiston xaritasida GPS orqali hududlarni egallash o\'yini API',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}`, description: 'Development' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = { swaggerSpec };
