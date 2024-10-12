"use server";

import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable, ScheduleTable } from "@/drizzle/schema";
import { scheduleFormSchema } from "@/schema/schedule";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import "use-server";
import { z } from "zod";

export async function saveSchedule(
  unsafeData: z.infer<typeof scheduleFormSchema>
) {
  const { userId } = auth();
  const { success, data } = scheduleFormSchema.safeParse(unsafeData);

  if (!success || userId == null) {
    return { error: true };
  }

  const { availabilities, ...scheduleData } = data;

  // will either insert a brand new user or will update the scheduleData
  const [{ id: scheduleId }] = await db
    .insert(ScheduleTable)
    .values({ ...scheduleData, clerkUserId: userId })
    //onConflictUpdate will run when we try to insert data but that data is already present
    .onConflictDoUpdate({
      target: ScheduleTable.clerkUserId, // this is the thing we check for conflict on
      set: scheduleData,
    })
    .returning({ id: ScheduleTable.id });

  const statements: [BatchItem<"pg">] = [
    db
      .delete(ScheduleAvailabilityTable)
      .where(eq(ScheduleAvailabilityTable.scheduleId, scheduleId)),
  ];

  if (availabilities?.length > 0) {
    statements.push(
      db.insert(ScheduleAvailabilityTable).values(
        availabilities?.map((availability) => ({
          ...availability,
          scheduleId,
        }))
      )
    );
  }

  await db.batch(statements);
}
