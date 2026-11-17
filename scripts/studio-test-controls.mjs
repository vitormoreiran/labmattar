// Follow the same disclosure path as the author; never force hidden controls.
export async function revealInspectorOptions(page, { fine = false } = {}) {
  const more = page.locator('.lm-studio-secondary');
  if (!await more.count()) return;
  if (!await more.evaluate(element => element.open)) await more.locator(':scope > summary').click();
  if (fine) {
    const toggle = more.locator('.lm-studio-details-toggle');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  }
}

export async function selectInspectorModule(page, module, { fine = false } = {}) {
  const button = page.locator('button[data-mobile-module="' + module + '"]');
  if (fine || !await button.isVisible()) await revealInspectorOptions(page, { fine });
  await button.click();
}
