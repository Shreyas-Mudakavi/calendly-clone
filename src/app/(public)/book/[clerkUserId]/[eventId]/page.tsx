import MeetingForm from "@/components/forms/MeetingForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { clerkClient } from "@clerk/nextjs/server";
import {
  addMonths,
  eachMinuteOfInterval,
  endOfDay,
  roundToNearestMinutes,
} from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function BookEventPage({
  params: { clerkUserId, eventId },
}: {
  params: { clerkUserId: string; eventId: string };
}) {
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, id }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, clerkUserId), eq(id, eventId)),
  });

  if (event === null) {
    return notFound();
  }

  const calenderUser = await clerkClient().users.getUser(clerkUserId);

  const startDate = roundToNearestMinutes(new Date(), {
    nearestTo: 15,
    roundingMethod: "ceil",
  });
  const endDate = endOfDay(addMonths(startDate, 2));

  // this is going to be a function that will take in an array - the range of all different start and end dates we need
  // every single possible time we want to check and we will also pass in all the information of the event we want to check for
  // so we need to pass an array of all the dates from startdate to enddate in 15 minute increments
  const validTimes = await getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 15 }),
    event
  );

  if (validTimes.length === 0) {
    return <NoTimeSlots event={event} calenderUser={calenderUser} />;
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          Book {event?.name} with {calenderUser.fullName}
        </CardTitle>

        {event?.description && (
          <CardDescription>{event.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <MeetingForm
          validTimes={validTimes}
          eventId={event?.id}
          clerkUserId={clerkUserId}
        />
      </CardContent>
    </Card>
  );
}

function NoTimeSlots({
  event,
  calenderUser,
}: {
  event: { name: string; description: string | null };
  calenderUser: { id: string; fullName: string | null };
}) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          Book {event.name} with {calenderUser.fullName}
        </CardTitle>
        {event.description && (
          <CardDescription>{event.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {calenderUser.fullName} is currently booked up. Please check back later
        or choose a shorter event.
      </CardContent>

      <CardFooter>
        <Button asChild>
          <Link href={`/book/${calenderUser.id}`}>Choose Another Event</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
