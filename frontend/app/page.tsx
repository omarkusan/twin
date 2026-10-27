import { Footer } from '@/components/site/Footer';
import { Nav } from '@/components/site/Nav';
import { TwinLauncher } from '@/components/site/TwinLauncher';
import { About } from '@/components/sections/About';
import { Contact } from '@/components/sections/Contact';
import { Experience } from '@/components/sections/Experience';
import { Hero } from '@/components/sections/Hero';
import { Journey } from '@/components/sections/Journey';
import { Projects } from '@/components/sections/Projects';
import { Skills } from '@/components/sections/Skills';
import { TwinSection } from '@/components/sections/TwinSection';
import { ExpandedTwin } from '@/components/twin/ExpandedTwin';
import { TwinProvider } from '@/components/twin/TwinProvider';

export default function Home() {
  return (
    <TwinProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Experience />
        <Skills />
        <Projects />
        <Journey />
        <TwinSection />
        <Contact />
      </main>
      <Footer />
      <TwinLauncher />
      <ExpandedTwin />
    </TwinProvider>
  );
}
