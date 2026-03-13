import Image from "next/image";
import { Badge } from "../ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { formatPercentage } from "@/lib/format";
import { NativeCounterUp } from "../uitripled/native-counter-up-carbon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../ui/carousel";
import React from "react";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import { EditImagesDialog } from "../dialogs/edit-images-dialog";

interface StatsCardProps {
  actionName: string;
  actionImageUrl: string;
  performedCount: number;
  userCount: number;
  totalUniqueUsers: number;
  totalActionsPerformed: number;
  userImages?: string[];
  guildId?: string | null;
  hideUserCount?: boolean;
}

export default function StatsCard({
  actionName,
  actionImageUrl,
  performedCount,
  userCount,
  totalUniqueUsers,
  totalActionsPerformed,
  userImages,
  guildId,
  hideUserCount,
}: StatsCardProps) {
  const displayName = actionName
    ? actionName[0].toUpperCase() + actionName.slice(1)
    : actionName;

  const hasUserImages = Array.isArray(userImages) && userImages.length > 0;
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi | null>(
    null,
  );
  const [editOpen, setEditOpen] = React.useState(false);
  const [liveImages, setLiveImages] = React.useState<string[]>(
    userImages ?? [],
  );

  React.useEffect(() => {
    setLiveImages(userImages ?? []);
  }, [userImages]);

  const liveImageCount = liveImages.filter(Boolean).length;

  return (
    <>
      <Card className="py-0 dark:bg-linear-to-t from-primary/20 to-15%">
        {hasUserImages ? (
          <Carousel
            setApi={setCarouselApi}
            opts={{
              loop: true,
            }}
          >
            <CarouselContent>
              {liveImages.map((url, idx) => (
                <CarouselItem key={idx}>
                  <Image
                    src={url}
                    alt={`${displayName} image ${idx + 1}`}
                    width={400}
                    height={400}
                    sizes="(min-width: 768px) 384px, 100vw"
                    className="block w-full aspect-square object-cover rounded-xl"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <Image
            src={actionImageUrl}
            alt={displayName}
            width={400}
            height={400}
            sizes="(min-width: 768px) 384px, 100vw"
            className="block w-full aspect-square object-cover rounded-xl"
          />
        )}
        <CardHeader className="flex items-center justify-between flex-grow">
          <CardTitle>{displayName}</CardTitle>

          <ButtonGroup>
            {hasUserImages && liveImageCount > 1 && (
              <Button
                type="button"
                onClick={() => carouselApi?.scrollPrev()}
                data-testid="prev"
                size={"sm"}
                aria-label="Previous image"
              >
                <ChevronLeftIcon />
                <span className="sr-only">Previous Image</span>
              </Button>
            )}
            {hasUserImages && (
              <Button
                type="button"
                size="sm"
                aria-label="Edit images"
                onClick={() => setEditOpen(true)}
              >
                <PencilIcon />
              </Button>
            )}
            {hasUserImages && liveImageCount > 1 && (
              <Button
                type="button"
                onClick={() => carouselApi?.scrollNext()}
                data-testid="next"
                size={"sm"}
                aria-label="Next image"
              >
                <ChevronRightIcon />
                <span className="sr-only">Next Image</span>
              </Button>
            )}
          </ButtonGroup>
        </CardHeader>
        <CardFooter className="border-t bg-muted/50 pb-6">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-1 flex-wrap">
              <p className="shrink">
                <b>Performed:</b>
              </p>
              <div className="flex justify-between grow">
                <NativeCounterUp
                  value={performedCount}
                  className="font-normal"
                />
                <Badge variant="outline">
                  {formatPercentage(performedCount, totalActionsPerformed)} of
                  actions
                </Badge>
              </div>
            </div>
            {!hideUserCount && (
              <div className="flex gap-1 flex-wrap">
                <p className="shrink">
                  <b>Users:</b>
                </p>
                <div className="flex justify-between grow">
                  <NativeCounterUp value={userCount} className="font-normal" />
                  <Badge variant="outline">
                    {formatPercentage(userCount, totalUniqueUsers)} of users
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      <EditImagesDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        actionName={actionName}
        guildId={guildId ?? null}
        initialImages={liveImages}
        onSaved={(saved) => {
          const filtered = saved.filter(Boolean);
          setLiveImages(filtered);
        }}
      />
    </>
  );
}
