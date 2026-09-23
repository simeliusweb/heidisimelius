import type { Control, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GIG_TICKET_FIELDS_ENABLED } from "./gigTicketFieldsSchema";

/**
 * Inputs for the fields in ./gigTicketFieldsSchema — ticket price and show length feed the
 * Event structured data on /keikat (offers.price and endDate).
 */
interface GigTicketFieldsProps<T extends FieldValues> {
  control: Control<T>;
}

const GigTicketFields = <T extends FieldValues>({
  control,
}: GigTicketFieldsProps<T>) =>
  GIG_TICKET_FIELDS_ENABLED && (
    <>
      <FormField
        name={"ticket_price" as Path<T>}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Lipun hinta alkaen (€)</FormLabel>
            <FormControl>
              <Input
                inputMode="decimal"
                placeholder="esim. 25 (0 = vapaa pääsy)"
                className="placeholder:text-accent"
                {...field}
              />
            </FormControl>
            <FormDescription>Näkyy Googlen hakutuloksissa.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name={"duration_minutes" as Path<T>}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kesto (min)</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="esim. 120"
                className="placeholder:text-accent"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Väliaika mukaan lukien. Oletus 2 h.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

export default GigTicketFields;
