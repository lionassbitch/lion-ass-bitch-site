"use client";

import { useEffect } from "react";
import "./lab.css";
import { labContent } from "./content";
import { About } from "./components/About";
import { Archetypes } from "./components/Archetypes";
import { Blueprint } from "./components/Blueprint";
import { Cta, Footer, Marquee } from "./components/Closing";
import { FieldNotes } from "./components/FieldNotes";
import { Hero } from "./components/Hero";
import { Manifesto } from "./components/Manifesto";
import { Nav, ScrollDial } from "./components/Nav";
import { Pillars } from "./components/Pillars";
import { Voguejitsu } from "./components/Voguejitsu";

/**
 * Scroll-driven brand site for Lion Ass Bitch (LAB).
 * Section order is the storytelling order; reorder or remove freely.
 */
export default function LabSite() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${labContent.brand.name} — ${labContent.brand.tagline}`;
    document.documentElement.classList.add("lab-scroll");
    document.body.classList.add("lab-scroll");
    // Client-rendered anchor targets do not exist during the browser's initial navigation.
    const anchorFrame = requestAnimationFrame(() => {
      const id = window.location.hash.slice(1);
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
    });
    return () => {
      cancelAnimationFrame(anchorFrame);
      document.title = previousTitle;
      document.documentElement.classList.remove("lab-scroll");
      document.body.classList.remove("lab-scroll");
    };
  }, []);

  return (
    <div className="lab">
      <a href="#lab-main" className="lab-skip-link">Skip to content</a>
      <Nav />
      <main id="lab-main" tabIndex={-1}>
        <Hero />
        <Manifesto />
        <Archetypes />
        <FieldNotes />
        <About />
        <Marquee />
        <Pillars />
        <Voguejitsu />
        <Blueprint />
        <Cta />
      </main>
      <Footer />
      <ScrollDial />
    </div>
  );
}
