// lib/config.js
// ═══════════════════════════════════════════════════════════
// HUB MAPPING
// Maps each person to their hub (Dubai or Lebanon) using
// their work email. Email is used because it's a unique ID
// that matches exactly between Asana and AD — whereas display
// names can have different formatting.
// ═══════════════════════════════════════════════════════════

export const HUB_BY_EMAIL = {
  // ── Dubai / United Arab Emirates ──────────────────────────
  'abdelnabi.alaeddine@umww.com': 'Dubai',
  'aishwarya.nair@onevuembww.com': 'Dubai',
  'akshata.shetty@umww.com': 'Dubai',
  'aly.hussein@umww.com': 'Dubai',
  'amel.rebbouh@umww.com': 'Dubai',
  'ankita.trivedi@umww.com': 'Dubai',
  'arsh.aftab@umww.com': 'Dubai',
  'ashwin.pillai@umww.com': 'Dubai',
  'aysegul.ocak@umww.com': 'Dubai',
  'bassam.aoun@umww.com': 'Dubai',
  'carel.habib@umww.com': 'Dubai',
  'darshan.jairaj@onevuembww.com': 'Dubai',
  'dina.thebian@umww.com': 'Dubai',
  'emre.kaya@umww.com': 'Dubai',
  'faisal.javed@umww.com': 'Dubai',
  'haris.khan@umww.com': 'Dubai',
  'jad.daou@umww.com': 'Dubai',
  'james.dutton@umww.com': 'Dubai',
  'joe.nicolas@umww.com': 'Dubai',
  'kareem.abdelsamad@umww.com': 'Dubai',
  'kundan.kumar@umww.com': 'Dubai',
  'lara.faraj@umww.com': 'Dubai',
  'lea.koyess@umww.com': 'Dubai',
  'mahmoud.jafar@umww.com': 'Dubai',
  'malek.honeine@umww.com': 'Dubai',
  'manu.puttaramaiah@umww.com': 'Dubai',
  'mariajose.ibrahim@umww.com': 'Dubai',
  'marina.ribeiro@umww.com': 'Dubai',
  'mia.haddad@umww.com': 'Dubai',
  'michel.zaidan@umww.com': 'Dubai',
  'mike.ernst@umww.com': 'Dubai',
  'moneer.alahmadieh@umww.com': 'Dubai',
  'natalie.murphy@umww.com': 'Dubai',
  'nick.burden@umww.com': 'Dubai',
  'nikhil.gandhi@umww.com': 'Dubai',
  'omar.usama@umww.com': 'Dubai',
  'prasad.abhanave@umww.com': 'Dubai',
  'qamar.alkhatib@onevuembww.com': 'Dubai',
  'rachel.sayegh@umww.com': 'Dubai',
  'rana.hassan@umww.com': 'Dubai',
  'ratnashankar@umww.com': 'Dubai',
  'rishad.alavi@umww.com': 'Dubai',
  'rita.salameh@umww.com': 'Dubai',
  'ruqayiah.alusman@umww.com': 'Dubai',
  'samer.awar@umww.com': 'Dubai',
  'tony.abousamra@umww.com': 'Dubai',

  // ── Lebanon / Beirut ──────────────────────────────────────
  'ahmad.habbal@umww.com': 'Lebanon',
  'aline.mahmoud@umww.com': 'Lebanon',
  'anthony.razzouk@umww.com': 'Lebanon',
  'bashar.hamieh@umww.com': 'Lebanon',
  'bassam.masry@umww.com': 'Lebanon',
  'celine.saade@umww.com': 'Lebanon',
  'charbel.abikhalil@umww.com': 'Lebanon',
  'charbel.sayegh@umww.com': 'Lebanon',
  'daniel.abbas@umww.com': 'Lebanon',
  'elias.rahme@umww.com': 'Lebanon',
  'elyssa.eltawil@umww.com': 'Lebanon',
  'gaby.bakhos@umww.com': 'Lebanon',
  'georges.gebara@umww.com': 'Lebanon',
  'ghina.sheikho@umww.com': 'Lebanon',
  'ghinwa.alghorayeb@umww.com': 'Lebanon',
  'glenda.sleiman@umww.com': 'Lebanon',
  'greg.iskenderian@umww.com': 'Lebanon',
  'ibrahim.elmadhoun@umww.com': 'Lebanon',
  'jad.kmeid@umww.com': 'Lebanon',
  'jad.mansour@umww.com': 'Lebanon',
  'jad.zeineddine@umww.com': 'Lebanon',
  'jennah.eleid@umww.com': 'Lebanon',
  'joe.elkhoury@umww.com': 'Lebanon',
  'karen.ghanem@umww.com': 'Lebanon',
  'lana.halawi@umww.com': 'Lebanon',
  'layan.murad@umww.com': 'Lebanon',
  'lea.elcheikh@umww.com': 'Lebanon',
  'lea.geagea@umww.com': 'Lebanon',
  'lynn.abdelkarim@umww.com': 'Lebanon',
  'lynn.hamdan@umww.com': 'Lebanon',
  'maher.elsahili@umww.com': 'Lebanon',
  'manar.boudargham@umww.com': 'Lebanon',
  'marc.baroud@umww.com': 'Lebanon',
  'maria.elias@umww.com': 'Lebanon',
  'mariam.bitar@umww.com': 'Lebanon',
  'maya.mahfouz@umww.com': 'Lebanon',
  'melissa.matar@umww.com': 'Lebanon',
  'michel.eid@umww.com': 'Lebanon',
  'mohamad.bouorm@umww.com': 'Lebanon',
  'mohamad.kobeitary@umww.com': 'Lebanon',
  'moustafa.nehme@umww.com': 'Lebanon',
  'myriam.elhage@umww.com': 'Lebanon',
  'nathalie.daher@umww.com': 'Lebanon',
  'noubar.sajian@umww.com': 'Lebanon',
  'rayan.elmasry@umww.com': 'Lebanon',
  'rita.saade@umww.com': 'Lebanon',
  'sara.ramadan@umww.com': 'Lebanon',
  'sarah.hanbali@umww.com': 'Lebanon',
  'serge.wassaf@umww.com': 'Lebanon',
  'shereen.ghanem@umww.com': 'Lebanon',
  'tala.berro@umww.com': 'Lebanon',
  'tia.ismail@umww.com': 'Lebanon',
  'yara.kassar@umww.com': 'Lebanon',
  'zeina.maasarani@umww.com': 'Lebanon',
};

// Legacy name-based mapping (fallback if email isn't available on a task)
// Only populated for key senior/frequent users to catch edge cases
export const HUB_MAP = {
  'Tony Abou Samra': 'Dubai',
  'Manu Puttaramaiah': 'Dubai',
  'Mike Ernst': 'Dubai',
  'Nick Burden': 'Dubai',
  'Anthony Razzouk': 'Lebanon',
  'Noubar Sajian': 'Lebanon',
  'Jad Kmeid': 'Lebanon',
  'Dina El Houssainy': 'Lebanon',
};

// Default hub if someone isn't found in either map
export const DEFAULT_HUB = 'Dubai';

// Expected weekly output per person (used for capacity calculations)
export const WEEKLY_CAPACITY = 8;

// Number of weeks shown in trend charts
export const TREND_WEEKS = 10;
