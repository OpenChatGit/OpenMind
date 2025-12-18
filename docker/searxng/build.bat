@echo off
echo Building OpenMind SearXNG Plugin...
echo.

REM Build the image
docker build -t teamaiko/openmindlabs-searxng:latest .

echo.
echo Build complete!
echo.
echo To push to Docker Hub:
echo   docker login
echo   docker push teamaiko/openmindlabs-searxng:latest
echo.
echo To test locally:
echo   docker run -d -p 8888:8080 --name openmind-searxng teamaiko/openmindlabs-searxng:latest
pause
