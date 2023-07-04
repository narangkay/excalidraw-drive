import React from "react";
import { useAtom } from "jotai";

import { jotaiScope } from "../../jotai";
import { Dialog } from "../../components/Dialog";
import { withInternalFallback } from "../../components/hoc/withInternalFallback";

import { FilledButton } from "../../components/FilledButton";
import { useTunnels } from "../../context/tunnels";
import { helpIcon } from "../../components/icons";
import { atom } from "jotai";
import { jotaiStore } from "../../jotai";
import "./PrivacyPolicy.scss";

export type privacyPolicyState =
  | {
      active: true;
      onClose: () => void;
      onConfirm: () => void;
      onReject: () => void;
    }
  | { active: false };

export const privacyPolicyStateAtom = atom<privacyPolicyState>({
  active: false,
});

export async function openPrivacyModal() {
  return new Promise<void>((resolve) => {
    jotaiStore.set(privacyPolicyStateAtom, {
      active: true,
      onConfirm: () => resolve(),
      onClose: () => resolve(),
      onReject: () => resolve(),
    });
  });
}

const PrivacyPolicyDialog = Object.assign(
  withInternalFallback("PrivacyPolicy", () => {
    const { OverwriteConfirmDialogTunnel } = useTunnels();
    const [privacyPolicyState, setState] = useAtom(
      privacyPolicyStateAtom,
      jotaiScope,
    );

    if (!privacyPolicyState.active) {
      return null;
    }

    const handleClose = () => {
      setState((state) => ({ ...state, active: false }));
    };

    const handleConfirm = () => {
      setState((state) => ({ ...state, active: false }));
    };

    return (
      <OverwriteConfirmDialogTunnel.In>
        <Dialog onCloseRequest={handleClose} title={false} size={916}>
          <div className="PrivacyPolicy">
            <div style={{ display: "flex", alignItems: "center" }}>
              <h3>Privacy Policy</h3>
              <div className="PrivacyPolicy__Description__icon">{helpIcon}</div>
            </div>
            <div
              className={`PrivacyPolicy__Description PrivacyPolicy__Description--color-primary`}
            >
              <div></div>
              <div className="PrivacyPolicy__Description__spacer">
                Excalidraw Drive doesn't collect any user data. It uses Google
                Drive API to authorize user and get access to documents selected
                by user, restricted only to those created by the user through
                the app. None of the documents leave the browser. Excalidraw.app
                is browser-only web app and doesn't have any remote data storage
                (e.g. database). Excalidraw.app's use of information received
                from Google APIs will adhere to the Google API Services User
                Data Policy, including the Limited Use requirements. If you have
                any questions about this Privacy Policy, You can contact me by
                email: kanarang@gmail.com
              </div>
            </div>
            <FilledButton
              size="large"
              label="Understood"
              onClick={handleConfirm}
            />
          </div>
        </Dialog>
      </OverwriteConfirmDialogTunnel.In>
    );
  }),
  {},
);

export { PrivacyPolicyDialog };
