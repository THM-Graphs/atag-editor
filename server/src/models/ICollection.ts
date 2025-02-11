export default interface ICollection {
  [keyof: string]: string | number;
  label: string;
  receivedBy: string;
  sentBy: string;
  status: string;
  uuid: string;
}
