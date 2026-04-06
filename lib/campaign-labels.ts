export type RaceType =
  | "state_house"
  | "state_senate"
  | "state_school_board"
  | "state_constitutional"
  | "county"
  | "county_school_board"
  | "municipal";

export type JurisdictionType = "lieutenant_governor" | "county" | "municipal";

export const RACE_TYPE_OPTIONS: { value: RaceType; label: string }[] = [
  { value: "state_house", label: "State House" },
  { value: "state_senate", label: "State Senate" },
  { value: "state_school_board", label: "State School Board" },
  { value: "state_constitutional", label: "State Constitutional" },
  { value: "county", label: "County" },
  { value: "county_school_board", label: "County School Board" },
  { value: "municipal", label: "Municipal" },
];

export const JURISDICTION_TYPE_OPTIONS: {
  value: JurisdictionType;
  label: string;
}[] = [
  { value: "lieutenant_governor", label: "Lieutenant Governor" },
  { value: "county", label: "County" },
  { value: "municipal", label: "Municipal" },
];

export function raceTypeLabel(value: string): string {
  return RACE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function jurisdictionTypeLabel(value: string): string {
  return JURISDICTION_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function defaultJurisdictionForRace(raceType: RaceType): JurisdictionType {
  switch (raceType) {
    case "state_house":
    case "state_senate":
    case "state_school_board":
    case "state_constitutional":
      return "lieutenant_governor";
    case "county":
    case "county_school_board":
      return "county";
    case "municipal":
      return "municipal";
    default:
      return "lieutenant_governor";
  }
}
