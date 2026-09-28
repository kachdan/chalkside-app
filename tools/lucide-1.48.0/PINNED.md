# Lucide, pinned at 1.48.0

The same release the Figma Icon component set was built from. Icons drifted
between Figma and the app in both directions because nobody was working from a
fixed version, so this is the version, and these are the files.

    package     lucide-static
    version     1.48.0
    tarball     https://registry.npmjs.org/lucide-static/-/lucide-static-1.48.0.tgz
    integrity   sha512-ZUGgZ4rzlLfVbhN2Zi37TMrTaSpXAbWx6Y/xZxKSDLPiqxtTK7Mw2M+oBJa0gjV8p3+CWBHh48u+IC9+jKlUjA==

Verified on download: the sha512 of the tarball matched the registry's
integrity field exactly.

Only the icons the app actually uses are kept here, not all 2118. To add one,
fetch that release again, check the hash, and copy the file in under its own
name. Never draw one.

    curl -sL -o lucide.tgz https://registry.npmjs.org/lucide-static/-/lucide-static-1.48.0.tgz
    openssl dgst -sha512 -binary lucide.tgz | base64      # must match above
    tar xzf lucide.tgz && cp package/icons/NAME.svg tools/lucide-1.48.0/

`tools/check-icons.js` compares what the app ships against these files,
character for character.

## Not from Lucide

Two icons are ours and are marked CUSTOM in the code: `baseball` and
`home-plate`. Lucide core has neither, and the bat-ball from @lucide/lab reads
as a paddle at 22px. They sit on the same 24 grid, stroke 2, round caps.
