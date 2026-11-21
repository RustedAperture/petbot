import Image from "next/image";
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
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import { ActionIcon } from "../action-icon";

interface StatsCardProps {
  actionName: string;
  actionImageUrl: string | null;
  performedCount: number;
  receivedCount?: number;
  userCount: number;
  totalUniqueUsers: number;
  totalActionsPerformed: number;
  userImages?: string[];
  hideUserCount?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  compact?: boolean;
  /** Shows an Adopt button, for a custom action the user doesn't own. */
  onAdopt?: () => void;
}

export default function StatsCard({
  actionName,
  actionImageUrl,
  performedCount,
  receivedCount,
  userCount,
  totalUniqueUsers,
  totalActionsPerformed,
  userImages,
  hideUserCount,
  onMouseEnter,
  onMouseLeave,
  compact = false,
  onAdopt,
}: StatsCardProps) {
  const displayName = actionName
    ? actionName[0].toUpperCase() + actionName.slice(1)
    : actionName;

  const [carouselApi, setCarouselApi] = React.useState<CarouselApi | null>(
    null,
  );
  const VALID_URL = /^https?:\/\//i;
  const displayImages = (userImages ?? []).filter((url) => VALID_URL.test(url));

  return (
    <>
      <Card
        size={compact ? "sm" : "default"}
        className={
          compact
            ? "data-[size=sm]:gap-0 data-[size=sm]:py-0 dark:bg-linear-to-t from-primary/20 to-[80px]"
            : "py-0 dark:bg-linear-to-t from-primary/20 to-15%"
        }
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {compact ? null : displayImages.length > 0 ? (
          <Carousel
            setApi={setCarouselApi}
            opts={{
              loop: true,
            }}
          >
            <CarouselContent>
              {displayImages.map((url, idx) => (
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
        ) : actionImageUrl ? (
          <Image
            src={actionImageUrl}
            alt={displayName}
            width={400}
            height={400}
            sizes="(min-width: 768px) 384px, 100vw"
            className="block w-full aspect-square object-cover rounded-xl"
          />
        ) : (
          <div
            data-testid="action-placeholder"
            className="flex w-full aspect-square items-center justify-center rounded-xl bg-muted"
          >
            <ActionIcon
              actionType={actionName}
              className="size-24 rounded-2xl [&_svg]:size-12"
            />
          </div>
        )}
        <CardHeader
          className={
            compact
              ? "flex flex-grow items-center justify-between py-4"
              : "flex flex-grow items-center justify-between"
          }
        >
          <CardTitle
            className={compact ? "flex items-center gap-2 text-sm" : undefined}
          >
            {compact && <ActionIcon actionType={actionName} />}
            {displayName}
          </CardTitle>

          <div className="flex items-center gap-2">
            {onAdopt && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onAdopt}
              >
                Adopt
              </Button>
            )}
            <ButtonGroup>
              {!compact && displayImages.length > 1 && (
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
              {!compact && displayImages.length > 1 && (
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
          </div>
        </CardHeader>
        <CardFooter
          className={
            compact
              ? "border-t bg-muted/50 pt-3 pb-3"
              : "border-t bg-muted/50 pb-6"
          }
        >
          <div
            className={
              compact
                ? "flex w-full flex-col gap-1"
                : "flex flex-col gap-2 w-full"
            }
          >
            <div className="flex gap-1 flex-wrap">
              <p className="shrink">
                <b>Performed:</b>
              </p>
              <div className="flex justify-between grow">
                <NativeCounterUp
                  value={performedCount}
                  className="font-normal"
                />
              </div>
            </div>
            {receivedCount !== undefined && (
              <div className="flex gap-1 flex-wrap">
                <p className="shrink">
                  <b>Received:</b>
                </p>
                <div className="flex justify-between grow">
                  <NativeCounterUp
                    value={receivedCount}
                    className="font-normal"
                  />
                </div>
              </div>
            )}
            {!hideUserCount && (
              <div className="flex gap-1 flex-wrap">
                <p className="shrink">
                  <b>Users:</b>
                </p>
                <div className="flex grow gap-1">
                  <NativeCounterUp value={userCount} className="font-normal" />{" "}
                  ({formatPercentage(userCount, totalUniqueUsers)})
                </div>
              </div>
            )}
            <p>
              {formatPercentage(performedCount, totalActionsPerformed)} of
              actions
            </p>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
