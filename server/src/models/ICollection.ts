export default interface ICollection {
  [keyof: string]: any;
  label: string;
  receivedBy: string;
  sentBy: string;
  status: string;
  uuid: string;
}
