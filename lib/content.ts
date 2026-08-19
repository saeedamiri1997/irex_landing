export const sections = [
  { id: 'hero', label: 'Hero' },
  { id: 'prediction', label: 'Prediction' },
  { id: 'principle', label: 'Principle' },
  { id: 'transparency', label: 'Transparency' },
  { id: 'control', label: 'Control' },
  { id: 'value', label: 'Economic Value' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'cgr-definition', label: 'CGR' },
  { id: 'apply', label: 'Apply' },
] as const;

export const narrativeVideo = '/media/irex-scroll-narrative.mp4';

export type VideoScene = {
  id: string;
  eyebrow: string;
  start: number;
  end: number;
  label: string;
  title: string;
  body?: string;
  blocks?: Array<{
    heading?: string;
    body?: string[];
  }>;
  highlights?: string[];
  listIntro?: string;
  bullets?: string[];
  closing?: string;
  coreLine?: string;
  cta?: boolean;
};

export const videoScenes: VideoScene[] = [
  {
    id: 'cgr',
    eyebrow: 'Computational Geological Reasoning™ (CGR™)',
    start: 0,
    end: 3.23,
    label: 'HERO SECTION',
    title: 'Make Better Target Decisions Before You Drill.',
    body: 'Transforming exploration from pattern matching to Computational Geological Reasoning™.',
    coreLine: 'Generate. Test. Reject',
    cta: true,
  },
  {
    id: 'prediction',
    eyebrow: '',
    start: 3.23,
    end: 8.07,
    label: 'FROM PREDICTION TO REASONING',
    title: 'From Prediction To Reasoning',
    body: 'Prediction shaped the last generation of exploration.',
    blocks: [
      {
        body: [
          'Reasoning will shape the next.',
        ],
      },
    ],
    closing: 'IREX optimizes for Decision Quality, Not Prediction Accuracy',
  },
  {
    id: 'first-principles',
    eyebrow: 'First Principles',
    start: 8.07,
    end: 14.46,
    label: 'FIRST PRINCIPLES',
    title: 'Ore deposits are not predictable.',
    body: 'Deposits footprints are noisy, localized expressions of underlying mineral systems.',
    blocks: [
      {
        body: [
          'While observations are incomplete and inconsistent, the systems themselves are governed by invariants.',
          'Understanding comes from identifying what remains consistent within noise - not from pattern matching.',
          'Prediction fails where the system is not understood.',
        ],
      },
    ],
    highlights: ['Prediction fails where the system is not understood.'],
    coreLine: 'Generate. Test. Reject',
    cta: true,
  },
  {
    id: 'problem',
    eyebrow: '',
    start: 14.46,
    end: 20.64,
    label: 'PROBLEM',
    title: 'Decisions Are Made Under Noise',
    blocks: [
      {
        body: [
          'What we observe at the deposit scale is noisy and incomplete - yet mineralisation models used for decision-making are built on these observations, shaped by noisy patterns and subjective interpretation.',
        ],
      },
    ],
    listIntro: 'This leads to:',
    bullets: [
      'High rates of unsuccessful drilling',
      'Overconfidence in weak signals',
      'Limited ability to test competing interpretations',
      'Poor visibility into decision-making logic',
    ],
  },
  {
    id: 'limitations',
    eyebrow: 'LIMITATIONS',
    start: 20.64,
    end: 25,
    label: 'LIMITATIONS',
    title: 'Patterns Don’t Equal Understanding',
    blocks: [
      {
        body: [
          'Most approaches rely on statistical patterns and assumed transferability.',
          'They treat deposits as comparable - even when the underlying systems differ.',
        ],
      },
    ],
    listIntro: 'In practice:',
    bullets: [
      'Models fit noise in sparse and incomplete datasets',
      'Correlation is mistaken for understanding',
      'Outputs are accepted rather than rigorously challenged',
    ],
    closing: 'The result is the illusion of predictive accuracy - without grounding in the underlying system.',
  },
];
