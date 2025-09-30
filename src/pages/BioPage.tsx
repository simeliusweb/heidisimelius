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
              Heidi Simelius on suomalainen laulaja, lauluntekijä ja esiintyjä, joka on tehnyt pitkän uran musiikki- ja teatterikentällä.
            </p>
            <p>
              Hänen monipuolinen taiteellinen työskentelynsä ulottuu soolourasta yhtyetoimintaan, teatterirooleista studiotyöskentelyyn. 
              Heidi on tunnettu ainutlaatuisesta äänestään ja tunteella toteutetuista esityksistään.
            </p>
            <p>
              Uransa aikana hän on esiintynyt lukuisilla näyttämöillä, tehnyt yhteistyötä monien arvostettujen taiteilijoiden kanssa 
              ja jättänyt pysyvän jäljen suomalaiseen musiikkikulttuuriin.
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
              <h3 className="text-xl font-semibold mb-2">Kansallisteatteri</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Musikaali - Rooli (Vuosi)</li>
                <li>Näytelmä - Rooli (Vuosi)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Helsingin kaupunginteatteri</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Musikaali - Rooli (Vuosi)</li>
                <li>Näytelmä - Rooli (Vuosi)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Tampereen Teatteri</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Musikaali - Rooli (Vuosi)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Svenska Teatern</h3>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Musikaali - Rooli (Vuosi)</li>
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
