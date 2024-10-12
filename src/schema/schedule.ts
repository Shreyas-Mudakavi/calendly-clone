import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { timetoInt } from "@/lib/utils";
import { z } from "zod";

export const scheduleFormSchema = z.object({
  timezone: z.string().min(1, "Required"),
  availabilities: z
    .array(
      z.object({
        dayOfWeek: z.enum(DAYS_OF_WEEK_IN_ORDER),
        startTime: z
          .string()
          .regex(
            /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
            "Time must be in the format HH:MM"
          ),
        endTime: z
          .string()
          .regex(
            /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
            "Time must be in the format HH:MM"
          ),
      })
    )
    .superRefine((availabilites, ctx) => {
      availabilites.forEach((availabilty, index) => {
        const overlaps = availabilites.some((a, i) => {
          return (
            i !== index && // if indexes are the same then it means the exact same availability so obviously they can't overlap with each other
            a.dayOfWeek === availabilty.dayOfWeek && // we are checking for days of week, bcz if they are not same then there's no issue
            timetoInt(a.startTime) < timetoInt(availabilty.endTime) && // we are checking - does the availability that I'm checking is the end time for my current availabilty after the start time of another availability
            timetoInt(a.endTime) > timetoInt(availabilty.startTime) // and is the start time for this availability before the end time of the other availaibility
          );
        });

        if (overlaps) {
          ctx.addIssue({
            code: "custom",
            message: "Availability overlaps with another",
            path: [index], // this path will specify where that shows up
            // so we are saying that path for this is going to be available at availability index
            // so which ever availability we are looping through we are gonna through error on that individual availability
          });
        }

        if (
          timetoInt(availabilty.startTime) >= timetoInt(availabilty.endTime)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "End time must be after start time",
            path: [index],
          });
        }
      });
    }),
});
