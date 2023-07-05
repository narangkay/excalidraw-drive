import { ToolButton } from "../../components/ToolButton";
import { useI18n } from "../../i18n";
import { ExcalidrawImperativeAPI } from "../../types";
import { SIDEBAR_CONFIG } from "./GoogleDriveSidebar";
import { useAtom } from "jotai";
import { loadingAtom } from "../data/GoogleDriveState";
import Spinner from "../../components/Spinner";

export const GoogleDriveAuthComponent: React.FC<{
  excalidrawAPI?: ExcalidrawImperativeAPI;
}> = ({ excalidrawAPI }) => {
  const { t } = useI18n();
  const [loading] = useAtom(loadingAtom);

  return (
    <div>
      <ToolButton
        className="Card-button"
        type="button"
        title={t(SIDEBAR_CONFIG.import.buttonLabel)}
        aria-label={t(SIDEBAR_CONFIG.import.buttonLabel)}
        showAriaLabel={true}
        onClick={() => {
          excalidrawAPI?.toggleSidebar({
            name: SIDEBAR_CONFIG.import.name,
          });
        }}
      />
      <ToolButton
        className="Card-button"
        type="button"
        title={t(SIDEBAR_CONFIG.export.buttonLabel)}
        aria-label={t(SIDEBAR_CONFIG.export.buttonLabel)}
        showAriaLabel={true}
        onClick={() => {
          excalidrawAPI?.toggleSidebar({
            name: SIDEBAR_CONFIG.export.name,
          });
        }}
      />
      {loading && <Spinner />}
    </div>
  );
};
