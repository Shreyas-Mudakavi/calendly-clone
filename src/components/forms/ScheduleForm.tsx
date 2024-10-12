"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import Link from "next/link";
import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { scheduleFormSchema } from "@/schema/schedule";
import { timetoInt } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { formatTimezoneOffset } from "@/lib/formatters";
import { Fragment, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "../ui/input";
import { saveSchedule } from "@/server/actions/schedule";

type Availability = {
  startTime: string;
  endTime: string;
  dayOfWeek: (typeof DAYS_OF_WEEK_IN_ORDER)[number]; // by putting [number] it will convert this to a list of all the values from that array
};

export default function ScheduleForm({
  schedule,
}: {
  schedule?: {
    timezone: string;
    availabilities: Availability[];
  };
}) {
  const [successMessage, setSuccessMessage] = useState<string>();

  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      // Intl.DateTimeFormat().resolvedOptions().timeZone - will give you whichever timezone you are in
      timezone:
        schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      availabilities: schedule?.availabilities.toSorted((a, b) => {
        return timetoInt(a.startTime) - timetoInt(b.endTime);
      }),
    },
  });

  // to deal with the array of data from which we can add or remove values dynamically we will use --
  // we need to pass the name of the thing we are using as an array
  const {
    append: addAvailability,
    remove: removeAvailability,
    fields: availabilityFields,
  } = useFieldArray({ name: "availabilities", control: form.control });

  const grpAvailabilityFields = Object.groupBy(
    availabilityFields.map((field, idx) => ({ ...field, idx })),
    (availability) => availability.dayOfWeek
  );

  async function onSubmit(values: z.infer<typeof scheduleFormSchema>) {
    const data = await saveSchedule(values);

    if (data?.error) {
      // 'root' level error
      form.setError("root", {
        message: "There was an error saving your schedule",
      });
    } else {
      setSuccessMessage("Schedule saved!");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col"
      >
        {form.formState.errors.root && (
          <div className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </div>
        )}
        {successMessage && (
          <div className="text-green-500 text-sm">{successMessage}</div>
        )}
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {Intl.supportedValuesOf("timeZone").map((timezone) => (
                    <SelectItem value={timezone} key={timezone}>
                      {timezone}
                      {` (${formatTimezoneOffset(timezone)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-[auto,1fr] gap-y-6 gap-x-4">
          {DAYS_OF_WEEK_IN_ORDER?.map((dayOfWeek) => (
            <Fragment key={dayOfWeek}>
              <div className="capitalize font-semibold text-sm">
                {dayOfWeek?.substring(0, 3)}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="size-6 p-1"
                  variant={"outline"}
                  onClick={() => {
                    addAvailability({
                      dayOfWeek,
                      startTime: "9:00",
                      endTime: "17:00",
                    });
                  }}
                >
                  <Plus className="size-full" />
                </Button>
                {grpAvailabilityFields[dayOfWeek]?.map((field, labelIdx) => (
                  <div className="flex flex-col gap-1" key={field.id}>
                    <div className="flex gap-2 items-center">
                      <FormField
                        control={form.control}
                        name={`availabilities.${field.idx}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="w-24"
                                aria-label={`${dayOfWeek} Start Time ${
                                  labelIdx + 1
                                }`}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      -
                      <FormField
                        control={form.control}
                        name={`availabilities.${field.idx}.endTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="w-24"
                                aria-label={`${dayOfWeek} End Time ${
                                  labelIdx + 1
                                }`}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        className="size-6 p-1"
                        variant={"destructiveGhost"}
                        onClick={() => removeAvailability(field.idx)}
                      >
                        <X />
                      </Button>
                    </div>
                    <FormMessage>
                      {
                        form.formState.errors.availabilities?.at?.(field.idx)
                          ?.root?.message
                      }
                    </FormMessage>

                    <FormMessage>
                      {
                        form.formState.errors.availabilities?.at?.(field.idx)
                          ?.startTime?.message
                      }
                    </FormMessage>

                    <FormMessage>
                      {
                        form.formState.errors.availabilities?.at?.(field.idx)
                          ?.endTime?.message
                      }
                    </FormMessage>
                  </div>
                ))}
              </div>
            </Fragment>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button disabled={form.formState.isSubmitting} type="submit">
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
