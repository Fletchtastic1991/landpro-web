import React, { useState } from "react";
import { ChevronDown, DollarSign } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PricingMode, PricingProfile, PRICING_MODE_LABELS } from "@/engines/pricing";

interface Props {
  profile:  PricingProfile;
  onChange: (patch: Partial<PricingProfile>) => void;
  onReset:  () => void;
  className?: string;
}

/** A labelled number input. Empty input is treated as 0. */
function MoneyField({ id, label, value, onChange, suffix, step = 1 }: {
  id: string; label: string; value: number; onChange: (n: number) => void; suffix?: string; step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

const PricingProfilePanel: React.FC<Props> = ({ profile, onChange, onReset, className }) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-lg border", className)}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between p-4 text-left" data-testid="your-rates-trigger">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-semibold">Your rates</span>
            <span className="text-xs text-muted-foreground">— {PRICING_MODE_LABELS[profile.mode]}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 px-4 pb-4">
        <div className="space-y-1">
          <Label className="text-xs">How do you charge for clearing?</Label>
          <Select value={profile.mode} onValueChange={v => onChange({ mode: v as PricingMode })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PRICING_MODE_LABELS) as PricingMode[]).map(m => (
                <SelectItem key={m} value={m}>{PRICING_MODE_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {profile.mode === "hourly" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MoneyField id="rate-machine" label="Machine rate" suffix="$/hr" value={profile.machineRatePerHr} onChange={n => onChange({ machineRatePerHr: n })} />
            <MoneyField id="rate-labor" label="Labor rate (per crew member)" suffix="$/hr" value={profile.laborRatePerHr} onChange={n => onChange({ laborRatePerHr: n })} />
          </div>
        )}

        {profile.mode === "per_acre" && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["light", "medium", "heavy"] as const).map(v => (
                <MoneyField key={v} id={`rate-acre-${v}`} label={`${v[0].toUpperCase()}${v.slice(1)} vegetation`} suffix="$/acre"
                  value={profile.perAcreRate[v]} onChange={n => onChange({ perAcreRate: { ...profile.perAcreRate, [v]: n } })} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Starting values are examples — enter what you actually charge. Build terrain/access difficulty into these rates.</p>
          </div>
        )}

        {profile.mode === "daily" && (
          <div className="space-y-2">
            <MoneyField id="rate-daily" label="Daily rate (machine + crew)" suffix="$/day" value={profile.dailyRate} onChange={n => onChange({ dailyRate: n })} />
            <p className="text-xs text-muted-foreground">Billed in whole days. Starting value is an example — enter your own.</p>
          </div>
        )}

        {profile.mode === "lump_sum" && (
          <div className="space-y-2">
            <MoneyField id="rate-lump" label="Your bid for the clearing work" suffix="$" value={profile.lumpSum} onChange={n => onChange({ lumpSum: n })} />
            <p className="text-xs text-muted-foreground">A lump sum is treated as all-in, so automatic site add-ons (debris haul-off, etc.) are not added on top.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4">
          <MoneyField id="rate-hpd" label="Productive hours per day" suffix="hrs" step={0.5} value={profile.productiveHoursPerDay} onChange={n => onChange({ productiveHoursPerDay: n })} />
          <MoneyField id="rate-mob" label="Mobilization fee" suffix="$" value={profile.mobilizationFee} onChange={n => onChange({ mobilizationFee: n })} />
          <MoneyField id="rate-min" label="Minimum job charge" suffix="$" value={profile.minimumCharge} onChange={n => onChange({ minimumCharge: n })} />
          <MoneyField id="rate-markup" label="Markup" suffix="%" value={profile.markupPct} onChange={n => onChange({ markupPct: n })} />
        </div>

        {profile.minimumCharge === 0 && (
          <p className="text-xs text-amber-500">
            Tip: set a minimum job charge so tiny jobs (e.g. 0.01 acre) never quote $0. Most contractors won't unload equipment for less than a set amount.
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Saved on this device.</p>
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>Reset to defaults</Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PricingProfilePanel;
