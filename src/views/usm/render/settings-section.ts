import { html, type TemplateResult } from 'lit';

import type { Locale } from '../../../core/i18n';
import type { SettingsSection, ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmSettingsSectionKind } from '../components/settings-section';
import type { UsmState } from '../model';

/**
 * One section of the settings dialog: the dialog's own frame (`dpk-dialog-*`)
 * around one of the overviews the map used to give a page of its own
 * (`status-overview`, `label-overview`, `member-overview`).
 *
 * The overview is not rendered here but in `<dpk-internal-usm-settings-section>`, which
 * owns its shadow root: however the dialog is drawn — by this view, or by the
 * element that owns the page's chrome — the section's markup and CSS stay
 * together (see `SettingsSection` in `core/shell/contracts.ts`).
 */
export const renderSettingsSection = (
  id: string,
  label: string,
  kind: UsmSettingsSectionKind,
  locale: Locale,
): SettingsSection<UsmState> => ({
  id,
  label,
  render: (context: ViewRenderContext<UsmState>): TemplateResult =>
    html`<div class="dpk-dialog-section" data-dialog-section=${id}>
      <dpk-internal-usm-settings-section
        .kind=${kind}
        .locale=${locale}
        .context=${context}
      ></dpk-internal-usm-settings-section>
    </div>`,
});
