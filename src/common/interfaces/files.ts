import { FILE_TYPES } from './constants';

export interface File {
  name: string;
  content: string;
  type: keyof typeof FILE_TYPES;
  lastModified: Date;
}
