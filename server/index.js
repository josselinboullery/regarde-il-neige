const crypto = require('node:crypto');
const { createApp } = require('./app');

const port = Number(process.env.PORT || 3000);
const generatedPassword = !process.env.ADMIN_PASSWORD;
const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
const adminUser = process.env.ADMIN_USER || 'admin';
const app = createApp({ adminPassword, adminUser });

app.locals.ready
  .then(() => {
    app.listen(port, () => {
      console.log(`Regarde il neige: http://localhost:${port}`);
      console.log(`Admin: http://localhost:${port}/admin`);
      console.log(`Utilisateur admin: ${adminUser}`);
      if (generatedPassword) {
        console.log(`Mot de passe admin temporaire: ${adminPassword}`);
        console.log('Definir ADMIN_PASSWORD dans .env ou environnement pour un mot de passe stable.');
      }
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
