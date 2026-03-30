import type { FunnyPagesSource } from "../types/app";

export type FunnyPagesPresetGroup = {
  id: string;
  label: string;
  blurb: string;
  sources: FunnyPagesSource[];
};

export const CLASSIC_FUNNY_PAGES: FunnyPagesSource[] = [
  { id: "peanuts", label: "Peanuts", provider: "gocomics", slug: "peanuts" },
  {
    id: "calvin-and-hobbes",
    label: "Calvin and Hobbes",
    provider: "gocomics",
    slug: "calvinandhobbes",
  },
  { id: "garfield", label: "Garfield", provider: "gocomics", slug: "garfield" },
  { id: "bc", label: "B.C.", provider: "gocomics", slug: "bc" },
  { id: "nancy", label: "Nancy", provider: "gocomics", slug: "nancy" },
  { id: "ziggy", label: "Ziggy", provider: "gocomics", slug: "ziggy" },
  { id: "marmaduke", label: "Marmaduke", provider: "gocomics", slug: "marmaduke" },
  { id: "pickles", label: "Pickles", provider: "gocomics", slug: "pickles" },
  { id: "baby-blues", label: "Baby Blues", provider: "gocomics", slug: "babyblues" },
  { id: "baldo", label: "Baldo", provider: "gocomics", slug: "baldo" },
  {
    id: "pearls-before-swine",
    label: "Pearls Before Swine",
    provider: "gocomics",
    slug: "pearlsbeforeswine",
  },
];

export const POLITICAL_FUNNY_PAGES: FunnyPagesSource[] = [
  { id: "doonesbury", label: "Doonesbury", provider: "gocomics", slug: "doonesbury" },
  { id: "non-sequitur", label: "Non Sequitur", provider: "gocomics", slug: "nonsequitur" },
  { id: "boondocks", label: "The Boondocks", provider: "gocomics", slug: "boondocks" },
];

export const WEBCOMIC_FUNNY_PAGES: FunnyPagesSource[] = [
  {
    id: "penny-arcade",
    label: "Penny Arcade",
    provider: "latest-webcomic",
    url: "https://www.penny-arcade.com/comic",
  },
  {
    id: "smbc",
    label: "SMBC",
    provider: "latest-webcomic",
    url: "https://www.smbc-comics.com/comic",
  },
  {
    id: "xkcd",
    label: "xkcd",
    provider: "latest-webcomic",
    url: "https://xkcd.com/",
  },
  {
    id: "phd-comics",
    label: "PHD Comics",
    provider: "latest-webcomic",
    url: "https://phdcomics.com/comics.php",
  },
  {
    id: "perry-bible-fellowship",
    label: "Perry Bible Fellowship",
    provider: "latest-webcomic",
    url: "https://pbfcomics.com/",
  },
  {
    id: "sarah-scribbles",
    label: "Sarah Scribbles",
    provider: "latest-webcomic",
    url: "https://sarahcandersen.com/",
  },
  {
    id: "achewood",
    label: "Achewood",
    provider: "latest-webcomic",
    url: "https://achewood.com/",
  },
];

export const FUNNY_PAGES_GROUPS: FunnyPagesPresetGroup[] = [
  {
    id: "classic",
    label: "Classic funny pages",
    blurb: "The old reliable breakfast-table stack.",
    sources: CLASSIC_FUNNY_PAGES,
  },
  {
    id: "political",
    label: "Political comics",
    blurb: "A more pointed page, with politics and satire up front.",
    sources: POLITICAL_FUNNY_PAGES,
  },
  {
    id: "webcomics",
    label: "Popular webcomics",
    blurb: "Penny Arcade and other internet-era fixtures.",
    sources: WEBCOMIC_FUNNY_PAGES,
  },
];

export const FUNNY_PAGES_PRESETS = FUNNY_PAGES_GROUPS.flatMap((group) => group.sources);
