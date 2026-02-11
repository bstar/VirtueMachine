{
  description = "VirtueMachine development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f:
        builtins.listToAttrs (map (system: {
          name = system;
          value = f system;
        }) systems);
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bashInteractive
              git
              gnumake
              cmake
              ninja
              clang
              lldb
              pkg-config
              python3
              nodejs_22
              ripgrep
              shellcheck
              shfmt
              clang-tools
            ];

            shellHook = ''
              export U6M_ROOT="$(pwd)"
              echo "VirtueMachine dev shell ready."
              echo "Run: ./modern/tools/sync_assets.sh"
            '';
          };
        });
    };
}
