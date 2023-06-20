import { ToolButton } from "../../components/ToolButton";
import { useI18n } from "../../i18n";
import { ExcalidrawImperativeAPI } from "../../types";
import { SIDEBAR_CONFIG, SidebarType } from "./GoogleDriveSidebar";

export const GoogleDriveAuthComponent: React.FC<{
  excalidrawAPI?: ExcalidrawImperativeAPI;
  sidebarType: SidebarType;
}> = ({ excalidrawAPI, sidebarType }) => {
  const { t } = useI18n();
  const config = SIDEBAR_CONFIG[sidebarType];
  return (
    <ToolButton
      className="Card-button"
      type="button"
      title={t(config.buttonLabel)}
      aria-label={t(config.buttonLabel)}
      showAriaLabel={true}
      onClick={() => {
        excalidrawAPI?.toggleSidebar({
          name: config.name,
        });
      }}
    />
  );
};
