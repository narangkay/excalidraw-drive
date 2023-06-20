import { ToolButton } from "../../components/ToolButton";
import { useI18n } from "../../i18n";
import { ExcalidrawImperativeAPI } from "../../types";
import { DRIVE_SIDEBAR_NAME } from "./GoogleDriveSidebar";

export const GoogleDriveAuthComponent: React.FC<{
  excalidrawAPI?: ExcalidrawImperativeAPI;
}> = ({ excalidrawAPI }) => {
  const { t } = useI18n();
  return (
    <ToolButton
      className="Card-button"
      type="button"
      title={t("exportDialog.googledrive_button")}
      aria-label={t("exportDialog.googledrive_button")}
      showAriaLabel={true}
      onClick={() => {
        excalidrawAPI?.toggleSidebar({ name: DRIVE_SIDEBAR_NAME });
      }}
    />
  );
};
