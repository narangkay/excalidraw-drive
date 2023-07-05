import { TokenResponse, hasGrantedAllScopesGoogle } from "@react-oauth/google";
import { atom } from "jotai";
import { tokenResponseReadAtom } from "../components/GoogleDriveLoginButton";

export type DriveFile = {
  kind: "drive#file";
  mimeType: "text/plain" | "application/octet-stream";
  id: string;
  name: string;
};

const initialDriveFilesAtom = atom((get) => {
  const tokenResponse = get(tokenResponseReadAtom);
  if (!tokenResponse) {
    return [];
  }
  return freshFetchFilesFromDrive(tokenResponse);
});
const overwrittenDriveFilesAtom = atom<DriveFile[] | null>(null);
export const driveFilesAtom = atom(
  (get) => get(overwrittenDriveFilesAtom) ?? get(initialDriveFilesAtom),
  async (get, set) => {
    const tokenResponse = get(tokenResponseReadAtom);
    if (!tokenResponse) {
      return;
    }
    set(
      overwrittenDriveFilesAtom,
      await freshFetchFilesFromDrive(tokenResponse),
    );
  },
);

export const loadingAtom = atom<boolean>(false);

export const selectedFileAtom = atom<DriveFile | undefined>(undefined);

export const freshFetchFilesFromDrive = (tokenResponse: TokenResponse) => {
  return fetchFromDrive(
    "GET",
    "https://www.googleapis.com/drive/v3/files",
    tokenResponse as TokenResponse,
  ).then((listJson) => (listJson as { files: DriveFile[] }).files);
};

export const createFileInDrive = async (
  tokenResponse: TokenResponse,
  newFileName: string,
) => {
  return fetchFromDrive(
    "POST",
    "https://www.googleapis.com/drive/v3/files",
    tokenResponse,
    JSON.stringify({
      mimeType: "text/plain",
      name: `${newFileName}.excalidraw`,
      description: "Auto created by excalidraw drive",
    }),
  ).then((json) =>
    fetchFromDrive(
      "PATCH",
      `https://www.googleapis.com/upload/drive/v3/files/${json.id}`,
      tokenResponse,
      "{}",
    ),
  );
};

export const fetchFromDrive: (
  method: "GET" | "POST" | "PATCH",
  url: string,
  tokenResponse?: TokenResponse,
  payload?: string,
) => Promise<any> = async (method, url, tokenResponse, payload) => {
  if (!tokenResponse) {
    return new Promise((resolve, reject) => {
      reject(new Error("not logged in"));
    });
  }
  if (
    !hasGrantedAllScopesGoogle(
      tokenResponse,
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.install",
    )
  ) {
    return new Promise((resolve, reject) => {
      reject(new Error("missing scopes."));
    });
  }
  return fetch(url, {
    method,
    headers: new Headers({
      "content-type": "text/plain",
      Authorization: `Bearer ${tokenResponse?.access_token}`,
    }),
    body: payload,
  }).then((response) => response.json());
};
