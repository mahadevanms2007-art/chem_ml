"""Phone-camera crust/corrosion scorer. Sends 'CAM:<0-100>' to the ESP32 over USB serial.
Install: pip install opencv-python pyserial numpy
Run:     python cam_score.py COM5 http://PHONE_IP:8080/video     (IP Webcam app URL, or 0 for a USB cam)
Set ROI to the cell terminals; tune colour ranges on your own photos."""
import sys, time, cv2, serial
port, src = sys.argv[1], sys.argv[2]
src = int(src) if src.isdigit() else src
ROI = (0.25, 0.25, 0.75, 0.75)   # x1,y1,x2,y2 as fractions of the frame
ser = serial.Serial(port, 115200, timeout=0.1)
cap = cv2.VideoCapture(src)
def score(frame):
    h, w = frame.shape[:2]
    c = frame[int(ROI[1]*h):int(ROI[3]*h), int(ROI[0]*w):int(ROI[2]*w)]
    hsv = cv2.cvtColor(cv2.GaussianBlur(c, (5, 5), 0), cv2.COLOR_BGR2HSV)
    white = cv2.inRange(hsv, (0, 0, 190), (180, 50, 255))      # white crust
    green = cv2.inRange(hsv, (70, 60, 60), (110, 255, 255))    # blue-green corrosion
    frac = (cv2.countNonZero(white) + cv2.countNonZero(green)) / (c.shape[0]*c.shape[1])
    return int(min(100, frac * 250))
last = 0
while True:
    ok, f = cap.read()
    if not ok: time.sleep(0.2); continue
    s = score(f)
    cv2.putText(f, f"crust {s}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.imshow("cam", f)
    if time.time() - last > 1: ser.write(f"CAM:{s}\n".encode()); last = time.time()
    if cv2.waitKey(1) == 27: break
