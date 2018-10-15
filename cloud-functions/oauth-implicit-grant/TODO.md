This should be in the next major version.

Instead of relying on a purpose-specific sequence implemented only by my script runner UI,
this will instead implement an extra layer that accepts requests, does the "embed" (really top-level redirect),
gets the token, and then returns it following the OAuth implicit grant specification. Other standard flows could
be implemented later.