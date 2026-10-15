// Plain-English names for ICAO aircraft type designators (the feed's `t` field).
// Covers common airliners, regional jets, business jets and light aircraft; other
// types fall back to a tidied-up version of the feed's own description.

export const AIRCRAFT_TYPES: Record<string, string> = {
  // Airbus
  BCS1: "Airbus A220-100",
  BCS3: "Airbus A220-300",
  A318: "Airbus A318",
  A319: "Airbus A319",
  A19N: "Airbus A319neo",
  A320: "Airbus A320",
  A20N: "Airbus A320neo",
  A321: "Airbus A321",
  A21N: "Airbus A321neo",
  A332: "Airbus A330-200",
  A333: "Airbus A330-300",
  A338: "Airbus A330-800neo",
  A339: "Airbus A330-900neo",
  A343: "Airbus A340-300",
  A346: "Airbus A340-600",
  A359: "Airbus A350-900",
  A35K: "Airbus A350-1000",
  A388: "Airbus A380",
  A400: "Airbus A400M",
  // Boeing
  B712: "Boeing 717",
  B736: "Boeing 737-600",
  B737: "Boeing 737-700",
  B738: "Boeing 737-800",
  B739: "Boeing 737-900",
  B37M: "Boeing 737 MAX 7",
  B38M: "Boeing 737 MAX 8",
  B39M: "Boeing 737 MAX 9",
  B3XM: "Boeing 737 MAX 10",
  B744: "Boeing 747-400",
  B748: "Boeing 747-8",
  B752: "Boeing 757-200",
  B753: "Boeing 757-300",
  B762: "Boeing 767-200",
  B763: "Boeing 767-300",
  B764: "Boeing 767-400",
  B772: "Boeing 777-200",
  B77L: "Boeing 777-200LR",
  B773: "Boeing 777-300",
  B77W: "Boeing 777-300ER",
  B778: "Boeing 777-8",
  B779: "Boeing 777-9",
  B788: "Boeing 787-8 Dreamliner",
  B789: "Boeing 787-9 Dreamliner",
  B78X: "Boeing 787-10 Dreamliner",
  MD11: "McDonnell Douglas MD-11",
  MD88: "McDonnell Douglas MD-88",
  // Regional
  E135: "Embraer ERJ 135",
  E145: "Embraer ERJ 145",
  E170: "Embraer E170",
  E75L: "Embraer E175",
  E75S: "Embraer E175",
  E190: "Embraer E190",
  E195: "Embraer E195",
  E290: "Embraer E190-E2",
  E295: "Embraer E195-E2",
  CRJ2: "Bombardier CRJ200",
  CRJ7: "Bombardier CRJ700",
  CRJ9: "Bombardier CRJ900",
  CRJX: "Bombardier CRJ1000",
  DH8A: "De Havilland Dash 8-100",
  DH8B: "De Havilland Dash 8-200",
  DH8C: "De Havilland Dash 8-300",
  DH8D: "De Havilland Dash 8-400",
  AT43: "ATR 42-300",
  AT45: "ATR 42-500",
  AT46: "ATR 42-600",
  AT72: "ATR 72",
  AT75: "ATR 72-500",
  AT76: "ATR 72-600",
  SB20: "Saab 2000",
  SF34: "Saab 340",
  // Business jets
  E50P: "Embraer Phenom 100",
  E55P: "Embraer Phenom 300",
  E35L: "Embraer Legacy 600",
  C25A: "Cessna Citation CJ2",
  C25B: "Cessna Citation CJ3",
  C25C: "Cessna Citation CJ4",
  C56X: "Cessna Citation Excel",
  C68A: "Cessna Citation Latitude",
  C700: "Cessna Citation Longitude",
  CL30: "Bombardier Challenger 300",
  CL35: "Bombardier Challenger 350",
  CL60: "Bombardier Challenger 600",
  GL5T: "Bombardier Global 5000",
  GLEX: "Bombardier Global Express",
  GL7T: "Bombardier Global 7500",
  GLF4: "Gulfstream IV",
  GLF5: "Gulfstream V",
  GLF6: "Gulfstream G650",
  LJ45: "Learjet 45",
  LJ60: "Learjet 60",
  F2TH: "Dassault Falcon 2000",
  FA7X: "Dassault Falcon 7X",
  FA8X: "Dassault Falcon 8X",
  H25B: "Hawker 800",
  PC12: "Pilatus PC-12",
  PC24: "Pilatus PC-24",
  BE20: "Beechcraft King Air 200",
  B350: "Beechcraft King Air 350",
  // Light aircraft and helicopters
  C152: "Cessna 152",
  C172: "Cessna 172 Skyhawk",
  C182: "Cessna 182 Skylane",
  C208: "Cessna 208 Caravan",
  P28A: "Piper PA-28 Cherokee",
  PA34: "Piper PA-34 Seneca",
  SR20: "Cirrus SR20",
  SR22: "Cirrus SR22",
  DA40: "Diamond DA40",
  DA42: "Diamond DA42",
  R44: "Robinson R44 helicopter",
  R22: "Robinson R22 helicopter",
  EC35: "Airbus H135 helicopter",
  EC45: "Airbus H145 helicopter",
  A139: "Leonardo AW139 helicopter",
  B06: "Bell 206 helicopter",
  S76: "Sikorsky S-76 helicopter",
  // Military transports often seen overhead
  C130: "Lockheed C-130 Hercules",
  C17: "Boeing C-17 Globemaster",
  K35R: "Boeing KC-135 Stratotanker",
};

/** Plain name for the aircraft: the lookup table first, then the feed's description tidied up. */
export function aircraftTypeName(typeCode: string | null, desc: string | null): string | null {
  const known = typeCode ? AIRCRAFT_TYPES[typeCode.toUpperCase()] : undefined;
  if (known) return known;
  if (desc) return tidyDescription(desc);
  return typeCode;
}

// "BOEING 737-800" -> "Boeing 737-800", "AIRBUS A-320" -> "Airbus A320".
function tidyDescription(desc: string): string {
  return desc
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (/\d/.test(word)) return word.replace(/^([A-Z])-(\d)/, "$1$2");
      return word[0] + word.slice(1).toLowerCase();
    })
    .join(" ");
}
