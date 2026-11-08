import { View } from 'react-native';

import { Pill } from '@/components/pill';
import { RatingScale } from '@/components/rating-scale';
import { Text } from '@/components/text';

const TAGS = [
  { value: 'cosy', label: 'Cosy' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'loud', label: 'Loud' },
  { value: 'quiet', label: 'Quiet' },
  { value: 'good_music', label: 'Good music' },
  { value: 'bright', label: 'Bright' },
  { value: 'crowded', label: 'Crowded' },
  { value: 'nice_view', label: 'Nice view' },
] as const;

const DATE_ANSWERS = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
] as const;

export type AmbienceTag = (typeof TAGS)[number]['value'];

// Sent as-is as this step's answers, so renaming a field here changes what's saved.
export type Ambience = {
  rating: number | null;
  tags: AmbienceTag[];
  goodForDate: (typeof DATE_ANSWERS)[number]['value'] | null;
};

export const emptyAmbience: Ambience = { rating: null, tags: [], goodForDate: null };

// What's still missing before Next, or null when it can be sent.
export function ambienceMissing(a: Ambience) {
  if (a.rating === null) return 'Pick a score from 1 to 10.';
  if (a.goodForDate === null) return 'Say whether it’s good for a date.';
  return null;
}

type Props = { value: Ambience; onChange: (value: Ambience) => void };

export function AmbienceStep({ value, onChange }: Props) {
  // Tapping a tag that's on turns it off; tapping one that's off adds it.
  function toggleTag(tag: AmbienceTag) {
    const tags = value.tags.includes(tag) ? value.tags.filter((t) => t !== tag) : [...value.tags, tag];
    onChange({ ...value, tags });
  }

  return (
    <View>
      <Text className="text-3xl font-bold text-ink">Ambience</Text>
      <Text className="mb-5 mt-1 text-[15px] text-muted">How did the place feel?</Text>

      <RatingScale
        value={value.rating}
        onChange={(rating) => onChange({ ...value, rating })}
        lowLabel="Wanted to leave"
        highLabel="Could stay all night"
      />

      <Text className="mb-3 mt-8 text-[16px] font-bold text-ink">Pick any that fit</Text>
      <View className="flex-row flex-wrap gap-2">
        {TAGS.map((tag) => (
          <Pill
            key={tag.value}
            label={tag.label}
            selected={value.tags.includes(tag.value)}
            onPress={() => toggleTag(tag.value)}
          />
        ))}
      </View>

      <Text className="mb-3 mt-8 text-[16px] font-bold text-ink">Good for a date?</Text>
      <View className="flex-row gap-2">
        {DATE_ANSWERS.map((answer) => (
          <Pill
            key={answer.value}
            label={answer.label}
            selected={value.goodForDate === answer.value}
            onPress={() => onChange({ ...value, goodForDate: answer.value })}
            role="radio"
            fill
          />
        ))}
      </View>
    </View>
  );
}
