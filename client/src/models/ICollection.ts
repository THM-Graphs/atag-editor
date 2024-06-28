export default interface ICollection {
  [keyof: string]: string | number;
  doctype: string;
  explicit: string;
  folioEnd: string;
  folioStart: string;
  // guid: string;
  incipit: string;
  inscriptio: string;
  label: string;
  normalizedLabel: string;
  receivedBy: string;
  sentBy: string;
  status: number;
  textGuid: string;
  uuid: string;
  websiteUrl: string;
}
