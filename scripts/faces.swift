// 이미지 목록에서 얼굴 찾기 (macOS Vision). 입력: 경로들(stdin 줄 단위) / 출력: 경로\t얼굴수\t가장 큰 얼굴 높이 비율\t신뢰도
import Foundation
import Vision

while let line = readLine() {
  let url = URL(fileURLWithPath: line)
  let req = VNDetectFaceRectanglesRequest()
  let handler = VNImageRequestHandler(url: url)
  do { try handler.perform([req]) } catch { print("\(line)\t-1\t0\t0"); continue }
  let faces = req.results ?? []
  let big = faces.map { $0.boundingBox.height }.max() ?? 0
  let conf = faces.map { $0.confidence }.max() ?? 0
  print("\(line)\t\(faces.count)\t\(String(format: "%.3f", big))\t\(String(format: "%.2f", conf))")
}
