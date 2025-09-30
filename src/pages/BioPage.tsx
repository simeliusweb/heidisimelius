import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

const BioPage = () => {
  return (
    <>
      <Helmet>
        <title>Bio - Heidi Simelius</title>
        <meta 
          name="description" 
          content="Heidi Simelius on suomalainen laulaja, lauluntekijä ja esiintyjä. Tutustu hänen uraansa ja kokemukseensa teatterista musiikkiin." 
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Hero Image Placeholder */}
        <div className="absolute inset-0 bg-card/50 backdrop-blur-sm" />
        
        {/* Hero Content */}
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-playfair font-extrabold italic text-primary">
            Bio
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <div className="bg-background">
        {/* Narrative Introduction */}
        <section className="container mx-auto px-6 py-16 md:py-24 max-w-4xl">
          <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
            <p>
              Heidi Simelius on laulaja, lauluntekijä ja esiintyjä. Hän keikkailee esittäen omaa musiikkiaan ja julkaisi vuonna 2023
ensimmäisen EP:nsä Mä vastaan. Viiden biisin EP sisältää nimikkokappaleen lisäksi mm. kappaleet Missä sä oot? ja Meitä ei ole
enää. Heidi on julkaissut aiemmin seitsemän singleä, mm. kappaleet Mun sydän on mun ja Upee. Heidin kappaleet ovat
suomenkielisiä sekä vahvasti tekstilähtöisiä ja musiikki on tyyliltään soulahtavaa poppia.
            </p>
            <p>
              Heidi oli mukana Voice of Finlandin uusimmalla kaudella, jossa hän lauloi tiensä semifinaaliin. Heidi esiintyy vaihtelevasti myös
erilaisten kokoonpanojen kanssa ja hänet on voitu nähdä mm. Suomen varusmiessoittokunnan ” 80’s kiertueen” ja Gospel
Helsinki -kuoron vierailevana solistina sekä keikoilla Pekka Simojoen kanssa.
            </p>
            <p>
              Heidi on valmistunut Tampereen Ammattikorkeakoulussa musiikkiteatterin ammattilaiskesi vuonna 2023 sekä Metropolia
Ammattikorkeakoulusta muusikoksi esiintyjä-linjalta pääaineenaan pop/jazz-laulu vuonna 2019.
            </p>
            <p>
              Kaudella 2023 – 2024 Heidi nähtiin Lahden Kaupunginteatterin Tootsie-musikaalissa. Kaudella 2022 – 2023 hän ihastutti
Porin Teatterin Evita-musikaalissa Rakastajattaren roolissa. Tulevalla kaudella 2025 Heidi nähdään Oulun teatterin Kinky Boots
-musikaalissa. Heidi tekee nimeä myös musikaali-suomentajana ja hänen ensimmäinen kokonaan suomentamansa musikaali
Laillisesti Blondi nähtiin Sellosalissa keväällä 2022.
            </p>
          </div>

          {/* CV Download Button */}
          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <a href="#" download>
                Lataa CV (PDF)
              </a>
            </Button>
          </div>
        </section>

        {/* Theatre Section */}
        <section className="container mx-auto px-6 py-16 md:py-24 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-playfair font-extrabold italic text-primary mb-8">
            Teatteri
          </h2>
          <div className="space-y-6 font-source text-foreground">
            <div>
              <h3 className="text-xl font-semibold mb-2">2025</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li><span className="text-foreground">Kinky Boots</span> | Oulun teatteri | Ensemble / Nicola Us</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2023</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Tootsie | Lahden Kaupunginteatteri | Ensemble</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2022</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Porin Teatteri | Rakastajatar / Ensemble</li>
                <li>Songs For A New World | TAMK | Ensemble</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2018</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Spring Awakening | Falmouth University, Englanti | Ensemble</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2016</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Suruttomat | Sellosali, Juvenalia Musiikkiteatterilinja | Johanna</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2014</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Evita | Tampereen Työväen Teatteri | Ensemble / Rakastajatar Us</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2011</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Onnen Vuori -musikaali | Suomen Lähetysseura, kiertueita ympäri Suomea | Angelina</li>
                <li>Stage – Silmistä Pois -musikaali | Helsinki Peacock ja Tampere-talo | Ensemble</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Translations Section */}
        <section className="container mx-auto px-6 py-16 md:py-24 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-playfair font-extrabold italic text-primary mb-8">
            Suomennokset
          </h2>
          <div className="space-y-4 font-source text-foreground">
            <div>
              <h3 className="text-xl font-semibold mb-2">Musikaalit</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Musikaalin nimi (Vuosi)</li>
                <li>Musikaalin nimi (Vuosi)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Discography Section */}
        <section className="container mx-auto px-6 py-16 md:py-24 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-playfair font-extrabold italic text-primary mb-8">
            Studio
          </h2>
          <div className="space-y-8 font-source text-foreground">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Sooloalbumit</h3>
              <ul className="space-y-2 text-muted">
                <li className="border-l-2 border-primary pl-4">
                  <span className="font-semibold text-foreground">Albumin nimi</span> (Vuosi)
                </li>
                <li className="border-l-2 border-primary pl-4">
                  <span className="font-semibold text-foreground">Albumin nimi</span> (Vuosi)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-4">Yhtyeet ja yhteistyöt</h3>
              <ul className="space-y-2 text-muted">
                <li className="border-l-2 border-primary pl-4">
                  <span className="font-semibold text-foreground">Yhtye - Albumin nimi</span> (Vuosi)
                </li>
                <li className="border-l-2 border-primary pl-4">
                  <span className="font-semibold text-foreground">Yhteistyö - Projektin nimi</span> (Vuosi)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-4">Teatteritallenukset</h3>
              <ul className="space-y-2 text-muted">
                <li className="border-l-2 border-primary pl-4">
                  <span className="font-semibold text-foreground">Musikaalin nimi - Soundtrackin nimi</span> (Vuosi)
                </li>
                <li className="border-l-2 border-primary pl-4">
                  <span className="font-semibold text-foreground">Musikaalin nimi - Soundtrackin nimi</span> (Vuosi)
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default BioPage;
