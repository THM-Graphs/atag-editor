export default interface ICollection {
  [keyof: string]: string | number | boolean;
  label: string;
  receivedBy: string;
  sentBy: string;
  status: string;
  uuid: string;
}
