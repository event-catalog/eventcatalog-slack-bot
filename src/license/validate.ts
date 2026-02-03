import { isEventCatalogScaleEnabled } from '@eventcatalog/license';
import pc from 'picocolors';

export async function validateLicense(): Promise<void> {
  const isScaleEnabled = await isEventCatalogScaleEnabled();

  if (!isScaleEnabled) {
    console.error(pc.red('━'.repeat(60)));
    console.error();
    console.error(pc.red(pc.bold('  EventCatalog Scale License Required')));
    console.error();
    console.error(
      pc.dim('  The EventCatalog Slack Bot requires an EventCatalog Scale license.')
    );
    console.error();
    console.error(pc.dim('  To get started:'));
    console.error(
      pc.dim('  1. Get a Scale license at ') +
        pc.cyan('https://eventcatalog.cloud')
    );
    console.error(
      pc.dim('  2. Set the ') +
        pc.yellow('EVENTCATALOG_SCALE_LICENSE_KEY') +
        pc.dim(' environment variable')
    );
    console.error();
    console.error(pc.red('━'.repeat(60)));
    process.exit(1);
  }
}
