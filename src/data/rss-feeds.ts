import type { RssSource } from "../types/app";

export type RssPresetGroup = {
  id: string;
  label: string;
  blurb: string;
  feeds: RssSource[];
};

export const RSS_PRESET_GROUPS: RssPresetGroup[] = [
  {
    id: "culture",
    label: "Culture",
    blurb: "Criticism, internet life, and cultural notebooks worth lingering over.",
    feeds: [
      { id: "hung-up", label: "Hung Up", url: "https://hungup.substack.com/feed" },
      { id: "the-free-press-culture", label: "The Free Press", url: "https://www.thefp.com/feed" },
      {
        id: "sweater-weather",
        label: "Sweater Weather",
        url: "https://sweaterweather.substack.com/feed",
      },
      { id: "user-mag", label: "User Mag", url: "https://www.usermag.co/feed" },
    ],
  },
  {
    id: "technology-business",
    label: "Technology and business",
    blurb: "Product, software, markets, and the internet as industry.",
    feeds: [
      {
        id: "pragmatic-engineer",
        label: "The Pragmatic Engineer",
        url: "https://newsletter.pragmaticengineer.com/feed",
      },
      {
        id: "lennys-newsletter",
        label: "Lenny's Newsletter",
        url: "https://www.lennysnewsletter.com/feed",
      },
      {
        id: "the-free-press-tech",
        label: "The Free Press",
        url: "https://www.thefp.com/feed",
      },
      { id: "slow-boring", label: "Slow Boring", url: "https://www.slowboring.com/feed" },
      { id: "platformer", label: "Platformer", url: "https://www.platformer.news/feed" },
      { id: "citrini-research", label: "Citrini Research", url: "https://www.citriniresearch.com/feed" },
    ],
  },
  {
    id: "writing-life",
    label: "Writing and life",
    blurb: "Language, creativity, taste, and the interior weather of the week.",
    feeds: [
      { id: "the-hyphen", label: "The Hyphen", url: "https://thehyphen.substack.com/feed" },
      {
        id: "monday-monday",
        label: "Monday Monday",
        url: "https://mondaymonday.substack.com/feed",
      },
      {
        id: "hung-up-writing",
        label: "Hung Up",
        url: "https://hungup.substack.com/feed",
      },
      { id: "the-free-press-writing", label: "The Free Press", url: "https://www.thefp.com/feed" },
      {
        id: "how-things-work",
        label: "How Things Work",
        url: "https://howthingswork.substack.com/feed",
      },
    ],
  },
  {
    id: "politics-society",
    label: "Politics and society",
    blurb: "Context, argument, and a steadier read on the day.",
    feeds: [
      {
        id: "letters-from-an-american",
        label: "Letters from an American",
        url: "https://heathercoxrichardson.substack.com/feed",
      },
      { id: "slow-boring-politics", label: "Slow Boring", url: "https://www.slowboring.com/feed" },
      { id: "the-free-press-politics", label: "The Free Press", url: "https://www.thefp.com/feed" },
      {
        id: "lennys-newsletter-politics",
        label: "Lenny's Newsletter",
        url: "https://www.lennysnewsletter.com/feed",
      },
      {
        id: "the-honest-broker",
        label: "The Honest Broker",
        url: "https://www.thehonestbroker.com/feed",
      },
    ],
  },
  {
    id: "literary",
    label: "Literary",
    blurb: "Criticism, reading life, and essayish newsletters with some style.",
    feeds: [
      {
        id: "sweater-weather",
        label: "Sweater Weather",
        url: "https://sweaterweather.substack.com/feed",
      },
      {
        id: "the-culture-we-deserve",
        label: "The Culture We Deserve",
        url: "https://theculturewedeserve.substack.com/feed",
      },
      { id: "the-hyphen-literary", label: "The Hyphen", url: "https://thehyphen.substack.com/feed" },
      { id: "hung-up-literary", label: "Hung Up", url: "https://hungup.substack.com/feed" },
      {
        id: "how-things-work-literary",
        label: "How Things Work",
        url: "https://howthingswork.substack.com/feed",
      },
    ],
  },
];

export const DEFAULT_RSS_SOURCES = RSS_PRESET_GROUPS[1].feeds.slice(0, 3).map((feed) => ({ ...feed }));
