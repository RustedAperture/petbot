{
  description = "Dev shell for petbot (Node + pnpm + sqlite3 build deps)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in {
        devShells.default = pkgs.mkShell {
          # Tools needed to develop and build node modules (e.g., sqlite3)
          packages = with pkgs; [
            nodejs_20 # LTS Node.js compatible with discord.js v14
            pnpm # Package manager (uses existing pnpm-lock.yaml)
            sqlite # libsqlite3 and headers for native builds
            pkg-config # Helps node-gyp find libraries
            python3 # node-gyp requirement
            gnumake # build toolchain
            gcc # C/C++ compiler for native modules
            libtool
            autoconf
            automake # common autotools used during native builds
          ];

          # Handy environment settings for reproducible installs
          shellHook = ''
            export npm_config_update_notifier=false
            export PUPPETEER_SKIP_DOWNLOAD=true
            echo "petbot dev shell ready: node $(node -v), pnpm $(pnpm -v)"
          '';
        };
      }
    );
}
