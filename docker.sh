#!/bin/bash
docker buildx build --platform linux/amd64,linux/arm64 -t huecester/friendly_local_jukebox --push .
