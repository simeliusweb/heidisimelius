export const SITE_URL = "https://www.heidisimelius.fi";

// Site-wide fallback for routes that do not render <PageMeta> (login, admin).
// Must stay in sync with the static tags in index.html so the initial markup and the
// Helmet-managed tag are identical and no swap happens on mount.
export const siteDefaultMeta = {
  title: "Heidi Simelius",
  description: "Heidi Simelius - Laulaja, lauluntekijä ja esiintyjä",
  // index.html's static og/twitter tags use this longer social-share copy
  socialDescription:
    "Tervetuloa Heidi Simeliuksen virallisille sivuille. Tutustu musiikkiin, tuleviin keikkoihin, teatteritöihin ja bilebändiin.",
  socialTitle: "Heidi Simelius | Laulaja, lauluntekijä ja esiintyjä",
};

export const pageMetadata = {
  home: {
    title:
      "Heidi Simelius | Laulaja, lauluntekijä, laulunopettaja ja esiintyjä",
    description:
      "Tervetuloa Heidi Simeliuksen virallisille sivuille. Tutustu musiikkiin, tuleviin keikkoihin, teatteritöihin ja bilebändiin.",
  },
  bio: {
    title: "Bio | Heidi Simelius",
    description:
      "Lue lisää laulaja ja musiikkiteatterin ammattilainen Heidi Simeliuksen urasta, koulutuksesta ja julkaisuista.",
  },
  keikat: {
    title: "Keikat | Heidi Simelius",
    description:
      "Katso Heidi Simeliuksen tulevat ja menneet keikat. Listalla ovat niin musiikkikeikat kuin teatteriesityksetkin.",
  },
  galleria: {
    title: "Galleria | Heidi Simelius",
    description:
      "Kuvia ja videoita Heidi Simeliuksen uralta. Selaa pressikuvia, keikkakuvia ja uusimpia musiikkivideoita.",
  },
  bilebandi: {
    title: "Heidi & The Hot Stuff - Bilebändi | Heidi Simelius",
    description:
      "Etsitkö energistä bilebändiä häihin tai yritysjuhliin? Tutustu Heidi & The Hot Stuff -yhtyeeseen ja varaa keikalle!",
  },
  laulunopetus: {
    title: "Laulunopetus Tampereella | Heidi Simelius",
    description:
      "Heidi Simelius opettaa yksilöllistä pop/jazz-laulua Tampereen laulukoululla Hämeenpuistossa. Laulutunnit sopivat sekä aloittelijoille että kokeneemmille laulajille.",
  },
};
