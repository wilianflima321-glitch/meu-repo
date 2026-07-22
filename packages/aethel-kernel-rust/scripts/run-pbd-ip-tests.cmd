@echo off
REM Letter ip — XPBD + fixed-substep module tests (re-run after freeing disk)
set CARGO_TARGET_DIR=E:\aethel-target-gnu-ip
cd /d "E:\Aethel engine\packages\aethel-kernel-rust"
cargo test --lib position_based_dynamics --target x86_64-pc-windows-gnu
echo EXIT=%ERRORLEVEL%
