const defaultContent = {
  schemaVersion: 1,
  updatedAt: '2026-06-18T00:00:00.000Z',
  site: {
    name: 'Regarde il neige',
    baseline: 'Compagnie de theatre musical',
    tagline: 'Un theatre musical poetique et humain, qui revisite les recits de notre imaginaire collectif.',
    email: 'regardeilneige@gmail.com',
    phone: '06 63 64 28 12 / 06 50 66 03 61',
    address: '150 avenue Gabriel Peri, 93400 Saint-Ouen-sur-Seine, France',
    socials: {
      instagram: 'https://www.instagram.com/compagnie_regarde_il_neige/',
      youtube: 'https://www.youtube.com/@regardeilneige',
      facebook: 'https://www.facebook.com/regardeilneige'
    }
  },
  home: {
    heroLabel: 'Compagnie de theatre musical - depuis 2014',
    heroTitle: 'Regarde il neige',
    intro: 'A travers nos creations, nous explorons les recits qui traversent notre imaginaire collectif - contes, mythes classiques ou contemporains - pour interroger ce qu ils disent de notre monde actuel.'
  },
  shows: [
    {
      slug: 'alice-au-pays-des-miroirs',
      title: 'Alice au pays des miroirs',
      category: 'Jeune public',
      age: 'A partir de 4 ans',
      duration: '55 minutes',
      cast: '4 comedien-nes',
      page: 'alice.html',
      image: 'assets/images/top-alice.avif',
      imageAlt: 'Alice au pays des miroirs',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-alice-au-pays-des-miroirs-web.pdf',
      status: 'published',
      shortDescription: 'Un hymne a l imagination librement inspire de Lewis Carroll.',
      body: ''
    },
    {
      slug: 'aurore',
      title: 'Aurore - La Belle au bois ne s endort pas',
      category: 'Jeune public',
      age: 'A partir de 4 ans',
      duration: '55 minutes',
      cast: '4 comedien-nes',
      page: 'aurore.html',
      image: 'assets/images/top-aurore.avif',
      imageAlt: 'Aurore - La Belle au bois ne s endort pas',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-aurore-2025.pdf',
      status: 'published',
      shortDescription: 'Relecture moderne de La Belle au bois dormant, entre rock, humour et poesie.',
      body: ''
    },
    {
      slug: 'ambroisie',
      title: 'Ambroisie',
      category: 'Jeune public',
      age: 'A partir de 5 ans',
      duration: '55 minutes',
      cast: '4 comedien-nes',
      page: 'ambroisie.html',
      image: 'assets/images/top-ambroisie.avif',
      imageAlt: 'Ambroisie',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-ambroisie.pdf',
      status: 'published',
      shortDescription: 'Ambroisie voit les personnages de Perrault s inviter dans sa chambre.',
      body: ''
    },
    {
      slug: 'robinson-crusoe-et-zoe-liberte',
      title: 'Robinson Crusoe et Zoe Liberte',
      category: 'Jeune public',
      age: 'A partir de 5 ans',
      duration: '55 minutes',
      cast: '2 comedien-nes',
      page: 'robinson.html',
      image: 'assets/images/top-robinson-crusoe.avif',
      imageAlt: 'Robinson Crusoe et Zoe Liberte',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-robinson-et-zoe-2026.pdf',
      status: 'published',
      shortDescription: 'Une reecriture malicieuse de Defoe, ode a la liberte.',
      body: ''
    },
    {
      slug: 'remi-do-et-gagaboum',
      title: 'Remi Do et Gagaboum',
      category: 'Jeune public',
      age: 'A partir de 2 ans',
      duration: '35 minutes',
      cast: '2 comedien-nes',
      page: 'remi-do-et-gagaboum.html',
      image: 'assets/images/top-remi-do-et-gagaboum.avif',
      imageAlt: 'Remi Do et Gagaboum',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-remi-do-et-gagaboum-2025.pdf',
      status: 'published',
      shortDescription: 'Un duo detonnant melant chansons originales et explorations sonores.',
      body: ''
    },
    {
      slug: 'le-conte-d-hiver',
      title: 'Le Conte d hiver - Shakespeare',
      category: 'Tout public',
      age: 'Tout public',
      duration: '90 minutes',
      cast: '6 interpretes',
      page: 'le-conte-d-hiver.html',
      image: 'assets/images/top-conte-hiver.avif',
      imageAlt: 'Le Conte d hiver - Shakespeare',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-le-conte-d-hiver-janvier-2026.pdf',
      status: 'published',
      shortDescription: 'D apres William Shakespeare, entre tragedie et espoir printanier.',
      body: ''
    },
    {
      slug: 'mathis-andersen',
      title: 'Mathis Andersen - Monde Monde',
      category: 'Tout public',
      age: 'Tout public',
      duration: '90 minutes',
      cast: 'Solo/Duo/Trio',
      page: 'mathis-andersen.html',
      image: 'assets/images/top-mathis-andersen.avif',
      imageAlt: 'Mathis Andersen - Monde Monde',
      imageSrcset: '',
      pdf: 'assets/pdf/dossier-de-presse-mathis-andersen-2026.pdf',
      status: 'published',
      shortDescription: 'Un concert humaniste et poetique, voyage sonore singulier.',
      body: ''
    }
  ],
  pages: [],
  agenda: [],
  team: [
    {
      slug: 'gaelle-hispard',
      name: 'Gaelle Hispard',
      role: 'Metteure en scene, autrice, compositrice, comedienne, musicienne',
      image: 'assets/images/gaelle-hispard.avif',
      status: 'published',
      order: 1
    },
    {
      slug: 'mathieu-gerhardt',
      name: 'Mathieu Gerhardt',
      role: 'Dramaturge, auteur, compositeur, comedien, musicien',
      image: 'assets/images/mathieu-gerhardt.avif',
      status: 'published',
      order: 2
    }
  ],
  contact: {
    people: [
      {
        role: 'Direction artistique',
        name: 'Gaelle Hispard et Mathieu Gerhardt',
        detail: '06 63 64 28 12 / 06 50 66 03 61 - regardeilneige@gmail.com'
      },
      {
        role: 'Diffusion',
        name: 'Gaelle Hispard',
        detail: 'regardeilneige@gmail.com'
      }
    ],
    partners: [
      { name: 'Toi Moi & Co - Acerma', logo: 'assets/images/contact-1.avif', category: 'Partenaires' },
      { name: 'Compagnie 50 Hirondelles', logo: 'assets/images/contact-2.avif', category: 'Partenaires' },
      { name: 'Sacem', logo: 'assets/images/contact-7.avif', category: 'Soutiens' },
      { name: 'Adami', logo: 'assets/images/contact-8.avif', category: 'Soutiens' },
      { name: 'Essaion Theatre', logo: 'assets/images/contact-11.avif', category: 'Programmation' },
      { name: 'Akteon Theatre', logo: 'assets/images/contact-12.avif', category: 'Programmation' }
    ]
  },
  seo: {
    title: 'Regarde il neige - Compagnie de theatre musical',
    description: 'Un theatre musical poetique et humain, qui revisite les recits de notre imaginaire collectif.'
  }
};

module.exports = defaultContent;
