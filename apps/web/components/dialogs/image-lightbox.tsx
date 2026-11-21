"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

/** Full-size view of a set of images, opened at `startIndex`. */
export function ImageLightbox({
  open,
  onOpenChange,
  title,
  images,
  startIndex,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  images: string[];
  startIndex: number;
}) {
  const hasMany = images.length > 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-2xl">
        <DialogTitle>{title}</DialogTitle>
        {/* min-w-0 stops the grid track growing to the image's natural width. */}
        <Carousel className="min-w-0" opts={{ startIndex, loop: true }}>
          <CarouselContent>
            {images.map((url, i) => (
              <CarouselItem key={url}>
                {/* A fixed frame with a `fill` image, so the image's own size never affects layout. */}
                <div className="relative h-[min(65dvh,36rem)] w-full">
                  <Image
                    src={url}
                    alt={`${title} ${i + 1} of ${images.length}`}
                    fill
                    sizes="(min-width: 640px) 672px, 100vw"
                    className="rounded-xl object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {hasMany && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
