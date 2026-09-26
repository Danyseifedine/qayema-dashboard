import { ExternalLink, LocateFixed, MapPin } from 'lucide-react'
import type { Control, FieldValues, FieldPath } from 'react-hook-form'
import { UrlField } from '@/shared/components/forms'
import { Button, HelperText } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import {
  googleMapsUrlFor,
  mapEmbedUrlFor,
  parseMapCoordinates,
  useCurrentLocation,
} from '../../hooks/use-current-location'

export type LocationFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  /** The link as it currently stands, so the map can follow it. */
  value: string | null
  /** Writes a link back into the form. */
  onPick: (url: string) => void
}

/**
 * Where the restaurant is, as one map link.
 *
 * There is no written address: a link is what a guest taps for directions, and
 * an owner standing in their own restaurant can fill it from where they are
 * rather than hunting for the place on a map.
 */
export function LocationField<T extends FieldValues>({
  control,
  name,
  value,
  onPick,
}: LocationFieldProps<T>) {
  const { locating, error, locate } = useCurrentLocation()
  const coordinates = parseMapCoordinates(value)

  return (
    <div className="flex flex-col gap-2">
      <UrlField
        control={control}
        name={name}
        label="Location"
        optionalText="optional"
        hint="Paste a link from Google Maps, or use where you are now."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={locating}
          leadingIcon={<LocateFixed className="size-3.5" />}
          onClick={() => locate((point) => onPick(googleMapsUrlFor(point)))}
        >
          {locating ? 'Finding you' : 'Use my current location'}
        </Button>

        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              'inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)]',
              'hover:text-accent hover:underline',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
            )}
          >
            Open in Google Maps
            <ExternalLink aria-hidden className="size-3" />
          </a>
        ) : null}
      </div>

      {error ? <HelperText tone="error">{error}</HelperText> : null}

      {coordinates ? (
        <figure className="flex flex-col gap-1.5">
          <iframe
            key={`${coordinates.lat},${coordinates.lng}`}
            title="Where your restaurant is"
            src={mapEmbedUrlFor(coordinates)}
            loading="lazy"
            /* OpenStreetMap's tile policy requires a real Referer and forbids a
               restrictive referrer policy, so neither is set. `allow-same-origin`
               is what lets the frame send one: without it the frame runs in an
               opaque origin, the tile requests arrive anonymous, and the tiles
               come back 403. It is safe here only because the frame is a third
               party — it restores openstreetmap.org's own origin, not ours, so
               it still cannot reach into this page. The rule below guards the
               same-origin case, which this is not; the sandbox is still
               stricter than none, since forms, popups and top-level
               navigation stay blocked. */
            // eslint-disable-next-line react/iframe-missing-sandbox -- third-party frame; see above
            sandbox="allow-scripts allow-same-origin"
            className="h-[180px] w-full rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--field)]"
          />
          <figcaption className="force-ltr flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
            <MapPin aria-hidden className="size-3" />
            {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
          </figcaption>
        </figure>
      ) : value ? (
        // A shortened share link hides its coordinates behind a redirect, so
        // there is nothing to draw. Say so rather than showing a blank frame.
        <HelperText>
          This link has no coordinates in it, so there is no map to show. It still works for guests.
        </HelperText>
      ) : null}
    </div>
  )
}
