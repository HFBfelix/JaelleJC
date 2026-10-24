/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import {test} from "node:test";
import assert from "node:assert/strict";
import {escapeHtml, escapeMultiline} from "./escape";

test("le HTML et les scripts sont neutralisés", () => {
  assert.equal(escapeHtml("<script>alert('x')</script>"), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  assert.equal(escapeHtml("<img src=x onerror=\"alert(1)\">"), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml("Jaelle & JC"), "Jaelle &amp; JC");
});

test("valeurs vides ou non textuelles", () => {
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(42), "42");
});

test("message multiligne : échappé puis retours à la ligne conservés", () => {
  assert.equal(escapeMultiline("Bonjour\n<b>merci</b>"), "Bonjour<br>&lt;b&gt;merci&lt;/b&gt;");
});
