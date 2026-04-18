import { Panel, PanelCard } from "@/components/panel";

interface Specs {
  typeName: string;
  cores: number;
  memory: number;
  disk: number;
  cpuType: "shared" | "dedicated";
  architecture: "x86" | "arm";
}

interface Location {
  name: string;
  city: string | null;
  country: string | null;
}

interface Props {
  specs: Specs | null;
  location: Location | null;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const formatLocation = (location: Location | null): string | null => {
  if (!location) {
    return null;
  }
  if (location.city && location.country) {
    return `${location.city}, ${location.country} (${location.name})`;
  }
  return location.name;
};

export const DetailsPanel = ({ specs, location }: Props) => {
  const locationLabel = formatLocation(location);

  return (
    <Panel>
      <PanelCard className="flex flex-col gap-1">
        {specs ? (
          <>
            <Row label="Server type" value={specs.typeName} />
            <Row label="vCPU" value={`${specs.cores} cores`} />
            <Row label="Memory" value={`${specs.memory} GB`} />
            <Row label="Local disk" value={`${specs.disk} GB`} />
            <Row label="CPU type" value={specs.cpuType === "shared" ? "Shared" : "Dedicated"} />
            <Row label="Architecture" value={specs.architecture.toUpperCase()} />
            {locationLabel && <Row label="Location" value={locationLabel} />}
          </>
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Server specs are unavailable.
          </div>
        )}
      </PanelCard>
    </Panel>
  );
};
