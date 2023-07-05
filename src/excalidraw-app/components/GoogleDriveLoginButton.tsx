import { ToolButton } from "../../components/ToolButton";
import { TokenResponse, useGoogleLogin } from "@react-oauth/google";
import { loadingAtom } from "../data/GoogleDriveState";
import { atom, useAtom } from "jotai";

const tokenResponseAtom = atom<TokenResponse | undefined>(undefined);
export const tokenResponseReadAtom = atom((get) => get(tokenResponseAtom));

export const GoogleDriveLoginButton: React.FC<{
  onError: (error: Error) => void;
}> = ({ onError }) => {
  const [, setTokenResponse] = useAtom(tokenResponseAtom);
  const [, setLoading] = useAtom(loadingAtom);
  const login = useGoogleLogin({
    onSuccess: (tokenResponse: TokenResponse) => {
      setTokenResponse(tokenResponse);
      setLoading(false);
    },
    onError: (error) => {
      onError(new Error(error.error_description));
      setLoading(false);
    },
    flow: "implicit",
    scope:
      "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install",
  });
  return (
    <ToolButton
      className="Card-button"
      type="button"
      title="Log In"
      aria-label="Log In"
      showAriaLabel={true}
      onClick={() => {
        setLoading(true);
        login();
      }}
    />
  );
};
